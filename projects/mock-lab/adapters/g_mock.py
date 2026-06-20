"""g_mock — 可植入的「灵活 mock」适配器：从本地文件或远端 URL 加载统一配置，
绑定到主流 Python HTTP mock 库（responses / respx）。

设计目标（对应 mock 研究室 · 配置工坊）：
  - 快速可接入：单文件、零硬依赖即可加载配置；绑定时才按需 import 对应库。
  - 可植入系统：把「mock 哪些、返回什么」抽成配置，不改业务代码即可共享/下发。
  - 本地或远端：`source` 可以是 dict、本地路径，或 http(s):// 远端 URL。

配置 schema（g-mock v1，可由配置工坊一键生成）::

    {
      "version": 1,
      "baseUrl": "https://api.example.com",
      "routes": [
        {
          "method": "GET",
          "path": "/users/1",
          "status": 200,
          "delayMs": 0,
          "headers": {"Content-Type": "application/json"},
          "body": {"id": 1, "name": "Ada"}   // dict/list 当 JSON 体，字符串当文本体
        }
      ]
    }

典型用法（推荐用环境变量切换本地/远端，无需改代码）::

    import os, g_mock

    MOCK_SOURCE = os.getenv("MOCK_SOURCE", "mocks/g-mock.json")

    # requests 栈
    with g_mock.bind_responses(MOCK_SOURCE):
        ...  # 调用被测代码

    # httpx 栈（含 async）
    with g_mock.bind_respx(MOCK_SOURCE):
        ...

本模块自身不依赖 requests / httpx / responses / respx；只有用到对应 binder 时才 import。
"""
from __future__ import annotations

import json
import urllib.request
from contextlib import contextmanager
from typing import Any, Dict, List, Union

__all__ = ["load_config", "normalize", "bind_responses", "bind_respx"]

Source = Union[str, Dict[str, Any]]


def load_config(source: Source, *, timeout: float = 10.0) -> Dict[str, Any]:
    """把 dict / 本地路径 / http(s) URL 统一加载并规整成 {version, baseUrl, routes}。"""
    if isinstance(source, dict):
        cfg = source
    elif isinstance(source, str) and source.startswith(("http://", "https://")):
        with urllib.request.urlopen(source, timeout=timeout) as resp:  # noqa: S310 (受控来源)
            cfg = json.loads(resp.read().decode("utf-8"))
    else:
        with open(source, "r", encoding="utf-8") as fh:
            cfg = json.load(fh)
    return normalize(cfg)


def normalize(cfg: Dict[str, Any]) -> Dict[str, Any]:
    """补默认值、拼出完整 URL、统一字段，便于各 binder 直接消费。"""
    base = str(cfg.get("baseUrl", "")).rstrip("/")
    routes: List[Dict[str, Any]] = []
    for raw in cfg.get("routes", []):
        path = str(raw.get("path", ""))
        routes.append(
            {
                "method": str(raw.get("method", "GET")).upper(),
                "path": path,
                "url": base + path,
                "status": int(raw.get("status", 200)),
                "headers": dict(raw.get("headers") or {}),
                "delayMs": int(raw.get("delayMs", 0) or 0),
                "body": raw.get("body"),
            }
        )
    return {"version": int(cfg.get("version", 1)), "baseUrl": base, "routes": routes}


def _is_json_body(body: Any) -> bool:
    return isinstance(body, (dict, list))


def _text_body(body: Any) -> str:
    if body is None:
        return ""
    if _is_json_body(body):
        return json.dumps(body, ensure_ascii=False)
    return str(body)


@contextmanager
def bind_responses(source: Source):
    """把配置注册到 `responses`，拦截 requests 发起的 HTTP 调用。

    需要安装 `responses`（pip install responses）。进入上下文注册全部路由，
    退出自动还原。yield 出底层 RequestsMock，便于额外断言。
    """
    import responses  # 延迟 import，避免无谓硬依赖

    cfg = load_config(source)
    with responses.RequestsMock(assert_all_requests_are_fired=False) as rsps:
        for r in cfg["routes"]:
            kwargs: Dict[str, Any] = {"status": r["status"], "headers": r["headers"]}
            if _is_json_body(r["body"]):
                kwargs["json"] = r["body"]
            else:
                kwargs["body"] = _text_body(r["body"])
            rsps.add(r["method"], r["url"], **kwargs)
        yield rsps


@contextmanager
def bind_respx(source: Source):
    """把配置注册到 `respx`，拦截 httpx（同步/异步）发起的 HTTP 调用。

    需要安装 `respx` 与 `httpx`。进入上下文注册全部路由，退出自动还原。
    """
    import httpx
    import respx

    cfg = load_config(source)
    with respx.mock(assert_all_called=False) as router:
        for r in cfg["routes"]:
            if _is_json_body(r["body"]):
                response = httpx.Response(r["status"], headers=r["headers"], json=r["body"])
            else:
                response = httpx.Response(r["status"], headers=r["headers"], text=_text_body(r["body"]))
            router.route(method=r["method"], url=r["url"]).mock(return_value=response)
        yield router


if __name__ == "__main__":  # 简单自检：加载并打印规整后的配置
    import sys

    src = sys.argv[1] if len(sys.argv) > 1 else {"version": 1, "baseUrl": "", "routes": []}
    print(json.dumps(load_config(src), ensure_ascii=False, indent=2))
