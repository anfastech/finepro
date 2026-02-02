import os

path = r"c:\Users\kpanfas\Desktop\core-project\finepro\backend\app\api\v1\websocket.py"
with open(path, "r") as f:
    lines = f.readlines()

new_lines = []
for line in lines:
    new_lines.append(line)
    if 'async def websocket_connect(websocket: WebSocket, token: str):' in line:
        new_lines.append('    with open("ws_debug.log", "a") as f:\n')
        new_lines.append('        from datetime import datetime\n')
        new_lines.append('        f.write(f"{datetime.now()} - ENTERING websocket_connect with token: {token[:15]}...\\n")\n')

with open(path, "w") as f:
    f.writelines(new_lines)

print("Patched successfully")
