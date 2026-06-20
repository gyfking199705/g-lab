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

    # requests-mock 栈
    with g_mock.bind_requests_mock(MOCK_SOURCE):
        ...

也能当一个真正的本地 mock 服务跑起来（零依赖，纯标准库）::

    python -m g_mock serve mocks/g-mock.json --port 8000
    python -m g_mock serve https://config.example.com/g-mock.json   # 远端配置
    python -m g_mock load mocks/g-mock.json                          # 打印规整后的配置

本模块自身不依赖 requests / httpx / responses / respx；只有用到对应 binder 时才 import。
serve 仅用标准库 http.server，无任何第三方依赖。
"""
from __future__ import annotations

import json
import urllib.request
from contextlib import contextmanager
from typing import Any, Dict, List, Union

__all__ = [
    "load_config",
    "normalize",
    "bind_responses",
    "bind_respx",
    "bind_requests_mock",
    "serve",
]

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


@contextmanager
def bind_requests_mock(source: Source):
    """把配置注册到 `requests_mock`，拦截 requests 发起的 HTTP 调用。

    需要安装 `requests-mock`（pip install requests-mock）。yield 出 Mocker，便于断言。
    """
    import requests_mock

    cfg = load_config(source)
    with requests_mock.Mocker() as m:
        for r in cfg["routes"]:
            kwargs: Dict[str, Any] = {"status_code": r["status"], "headers": r["headers"]}
            if _is_json_body(r["body"]):
                kwargs["json"] = r["body"]
            else:
                kwargs["text"] = _text_body(r["body"])
            m.register_uri(r["method"], r["url"], **kwargs)
        yield m


# ── 当一个真正的本地 mock 服务跑起来（纯标准库，无第三方依赖）──

def _build_handler(routes: List[Dict[str, Any]]):
    import time
    from http.server import BaseHTTPRequestHandler
    from urllib.parse import urlparse

    # 按 (method, path) 建索引；path 用配置里的 path 字段（忽略 baseUrl 与 query）
    index = {(r["method"], r["path"]): r for r in routes}

    class Handler(BaseHTTPRequestHandler):
        server_version = "g-mock/1.0"

        def _dispatch(self):
            path = urlparse(self.path).path
            route = index.get((self.command, path))
            if route is None:
                payload = json.dumps(
                    {"error": "no_mock", "method": self.command, "path": path},
                    ensure_ascii=False,
                ).encode("utf-8")
                self.send_response(404)
                self.send_header("Content-Type", "application/json; charset=utf-8")
                self.send_header("Content-Length", str(len(payload)))
                self.end_headers()
                self.wfile.write(payload)
                return
            if route["delayMs"]:
                time.sleep(route["delayMs"] / 1000.0)
            body = _text_body(route["body"]).encode("utf-8")
            headers = dict(route["headers"])
            headers.setdefault(
                "Content-Type",
                "application/json; charset=utf-8" if _is_json_body(route["body"]) else "text/plain; charset=utf-8",
            )
            self.send_response(route["status"])
            for key, value in headers.items():
                self.send_header(key, str(value))
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            if self.command != "HEAD":
                self.wfile.write(body)

        # 把常见方法都路由到统一分发
        do_GET = _dispatch
        do_POST = _dispatch
        do_PUT = _dispatch
        do_PATCH = _dispatch
        do_DELETE = _dispatch
        do_HEAD = _dispatch
        do_OPTIONS = _dispatch

        def log_message(self, fmt, *args):  # noqa: A003 - 安静日志
            return

    return Handler


def serve(source: Source, host: str = "127.0.0.1", port: int = 8000):
    """用标准库 http.server 把配置当本地 mock 服务跑起来（Ctrl+C 停止）。"""
    from http.server import ThreadingHTTPServer

    cfg = load_config(source)
    handler = _build_handler(cfg["routes"])
    httpd = ThreadingHTTPServer((host, port), handler)
    print(f"g-mock serving {len(cfg['routes'])} route(s) on http://{host}:{port}  (Ctrl+C to stop)")
    for r in cfg["routes"]:
        print(f"  {r['method']:7} {r['path']}  ->  {r['status']}")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nstopped.")
    finally:
        httpd.server_close()


def _main(argv: List[str]) -> int:
    import argparse

    parser = argparse.ArgumentParser(prog="g_mock", description="g-mock 适配器 CLI")
    sub = parser.add_subparsers(dest="cmd")

    p_serve = sub.add_parser("serve", help="把配置当本地 mock 服务跑起来")
    p_serve.add_argument("source", help="本地路径或 http(s):// 远端配置 URL")
    p_serve.add_argument("--host", default="127.0.0.1")
    p_serve.add_argument("--port", type=int, default=8000)

    p_load = sub.add_parser("load", help="加载并打印规整后的配置")
    p_load.add_argument("source", help="本地路径或 http(s):// 远端配置 URL")

    args = parser.parse_args(argv)
    if args.cmd == "serve":
        serve(args.source, host=args.host, port=args.port)
        return 0
    if args.cmd == "load":
        print(json.dumps(load_config(args.source), ensure_ascii=False, indent=2))
        return 0
    parser.print_help()
    return 1


if __name__ == "__main__":
    import sys

    raise SystemExit(_main(sys.argv[1:]))
