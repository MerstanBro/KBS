import math
from typing import Any

from constants import TOGGLE_BESTCASE, TOTAL_DELIVERY_ITEMS


def calc_strict_upper_bound(pavilions, start_x, start_y, wx, wy):
    unique_p = list({(p[1], p[2]) for p in pavilions if p[5] > 0})
    distances = list(map(lambda pos: abs(wx - pos[0]) + abs(wy - pos[1]), unique_p))
    start_dist = abs(start_x - wx) + abs(start_y - wy)
    round_trips = sum(map(lambda d: d * 2, distances))
    action_tax = len(distances) * 2
    longest_dist = max(distances or [0])
    return start_dist + round_trips + action_tax - longest_dist


def parse_pretest(pretest_data: dict) -> tuple[dict, tuple, int, int]:
    meta = pretest_data["meta"]
    pavilions = tuple(
        (p["pid"], p["x"], p["y"], p["type"], p["color"], p["needed"], p["delivered"])
        for p in pretest_data["pavilions"]
    )
    start_x = meta.get("start_x", 3)
    start_y = meta.get("start_y", 1)
    return meta, pavilions, start_x, start_y


def node_to_dict(node) -> dict[str, Any]:
    return {
        "node_id": node["id"],
        "parent_id": node["pid"],
        "robot_x": node["rx"],
        "robot_y": node["ry"],
        "robot_state": node["state"],
        "status": node["status"],
        "g_n": node["g"],
        "f_n": node["f"],
        "h_n": node["h"],
        "last_action": node["action"],
    }


def distribute_cost(total: int, count: int) -> list[int]:
    if count <= 0:
        return []
    base, rem = divmod(total, count)
    return [base + (1 if i < rem else 0) for i in range(count)]


def classify_action(action: str) -> tuple[str | None, str]:
    if action.startswith("Loaded:"):
        return "robot load", action.removeprefix("Loaded:").strip()
    if action.startswith("Unloaded"):
        return "robot unload", ""
    if "Finished loading" in action or "Dispatched" in action:
        return "robot dispatch", ""
    if "System Frame" in action:
        return "robot start", "initial position"
    return None, ""


def action_extra_cost(command: str | None) -> int:
    if command in ("robot unload", "robot dispatch"):
        return 1
    return 0


def format_action_line(command: str, detail: str, state: str, rx: int, ry: int, inc: int, g: int) -> str:
    parts = [command]
    if detail:
        parts.append(detail)
    parts.extend([f"state={state}", f"pos=({rx},{ry})", f"+{inc}", f"g={g}"])
    return " | ".join(parts)


def format_move_line(label: str, mx: int, my: int, inc: int, running_g: int) -> str:
    return f"{label} | pos=({mx},{my}) | +{inc} | g={running_g}"


def calc_h(dr1, dr2, dr3, dt1, dt2, do1, do2, dg1, dg2, rx, ry):
    rem1 = (2 - dr1) + (1 - dr2) + (1 - dr3)
    rem2 = (3 - dt1) + (1 - dt2)
    rem3 = (2 - do1) + (1 - do2)
    rem4 = (2 - dg1) + (2 - dg2)

    dist1 = (abs(rx - 2) + abs(ry - 4)) * (rem1 > 0) + 999 * (rem1 == 0)
    dist2 = (abs(rx - 4) + abs(ry - 3)) * (rem2 > 0) + 999 * (rem2 == 0)
    dist3 = (abs(rx - 4) + abs(ry - 5)) * (rem3 > 0) + 999 * (rem3 == 0)
    dist4 = (abs(rx - 5) + abs(ry - 2)) * (rem4 > 0) + 999 * (rem4 == 0)

    m = min(dist1, dist2, dist3, dist4)
    return m * (m != 999)


def calc_bc(tot_d, tot_i):
    tot_rem = (TOTAL_DELIVERY_ITEMS - tot_d - tot_i)
    tot_rem = tot_rem * (tot_rem > 0)
    trips = math.ceil(tot_rem / 4.0)
    return int((trips * 6 - 2) * (trips > 0)) * TOGGLE_BESTCASE


def is_invalid_load(r1, r2, r3, t1, t2, o1, o2, g1, g2):
    types = ((r1 + r2 + r3) > 0) + ((t1 + t2) > 0) + ((o1 + o2) > 0) + ((g1 + g2) > 0)
    colors = ((r1 + t1) > 0) + ((r2 + o2) > 0) + (r3 > 0) + (t2 > 0) + (o1 > 0) + (g1 > 0) + (g2 > 0)
    return (types > 1) * (colors > 1)


def can_load(li, target_li, inv, deliv, max_need, tot_i):
    return (li <= target_li) * ((inv + deliv) < max_need) * (tot_i < 4)
