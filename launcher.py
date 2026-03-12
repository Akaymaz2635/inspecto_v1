"""
QualityCtrl — Standalone Launcher
Uvicorn'u arka planda başlatır, pywebview ile native pencere açar.
Pencere kapatılınca uygulama tamamen kapanır.
"""
import socket
import sys
import threading
import time
import urllib.request
import urllib.error

import uvicorn
import webview


def _find_free_port() -> int:
    """Kullanılmayan bir port bulur."""
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.bind(("127.0.0.1", 0))
        return s.getsockname()[1]


def _wait_for_server(url: str, timeout: float = 15.0) -> bool:
    """Sunucu hazır olana kadar bekler."""
    deadline = time.time() + timeout
    while time.time() < deadline:
        try:
            urllib.request.urlopen(url, timeout=1)
            return True
        except Exception:
            time.sleep(0.15)
    return False


def _start_server(port: int) -> None:
    """Uvicorn'u daemon thread'de çalıştırır."""
    config = uvicorn.Config(
        "backend.main:app",
        host="127.0.0.1",
        port=port,
        log_level="warning",
    )
    server = uvicorn.Server(config)
    server.run()


def main() -> None:
    port = _find_free_port()
    base_url = f"http://127.0.0.1:{port}"

    # Sunucuyu arka planda başlat
    t = threading.Thread(target=_start_server, args=(port,), daemon=True)
    t.start()

    # Sunucu hazır olana kadar bekle
    if not _wait_for_server(base_url):
        print("HATA: Sunucu başlatılamadı.", file=sys.stderr)
        sys.exit(1)

    # Native pencereyi aç
    webview.create_window(
        title="QualityCtrl — Muayene Sistemi",
        url=base_url,
        width=1366,
        height=900,
        min_size=(900, 600),
        text_select=False,
    )
    webview.start()
    # Pencere kapanınca buraya gelir → uygulama biter, daemon thread de ölür


if __name__ == "__main__":
    main()
