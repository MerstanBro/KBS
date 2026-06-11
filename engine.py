import math
from queue import Queue
from typing import Any, Optional

from experta import *

# ==========================================
# 0. THE INTERVIEW "KILL SWITCH"
# ==========================================
TOGGLE_BESTCASE = 1

DEFAULT_PRETEST = {
    "meta": {
        "max_load": 4,
        "warehouse_x": 3,
        "warehouse_y": 2,
        "start_x": 3,
        "start_y": 1,
    },
    "pavilions": [
        {"pid": 1, "x": 2, "y": 4, "type": "Rose", "color": "red", "needed": 2, "delivered": 0},
        {"pid": 1, "x": 2, "y": 4, "type": "Rose", "color": "pink", "needed": 1, "delivered": 0},
        {"pid": 1, "x": 2, "y": 4, "type": "Rose", "color": "white", "needed": 1, "delivered": 0},
        {"pid": 2, "x": 4, "y": 3, "type": "Tulip", "color": "red", "needed": 3, "delivered": 0},
        {"pid": 2, "x": 4, "y": 3, "type": "Tulip", "color": "yellow", "needed": 1, "delivered": 0},
        {"pid": 3, "x": 4, "y": 5, "type": "Orchid", "color": "purple", "needed": 2, "delivered": 0},
        {"pid": 3, "x": 4, "y": 5, "type": "Orchid", "color": "pink", "needed": 1, "delivered": 0},
        {"pid": 4, "x": 5, "y": 2, "type": "Rose Goliat", "color": "gold", "needed": 2, "delivered": 0},
        {"pid": 4, "x": 5, "y": 2, "type": "Rose Goliat", "color": "light pink", "needed": 2, "delivered": 0},
    ],
}


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


# ==========================================
# 1. PURE LOGIC SCHEMAS (FLATTENED STATE)
# ==========================================

class SystemControl(Fact):
    phase = Field(str, default="search")

class SystemMeta(Fact):
    upper_bound = Field(int, mandatory=True)
    max_load = Field(int, mandatory=True)

class SearchNode(Fact):
    id = Field(int, mandatory=True)
    pid = Field(int, mandatory=True)
    state = Field(str, mandatory=True)
    status = Field(str, default="open")
    action = Field(str, default="spawn")

    rx = Field(int, default=3)
    ry = Field(int, default=1)

    g = Field(int, default=0)
    h = Field(int, default=0)
    f = Field(int, default=0)
    bc = Field(int, default=0)

    last_item = Field(int, default=1)
    tot_i = Field(int, default=0)
    tot_d = Field(int, default=0)

    i_rr = Field(int, default=0); i_rp = Field(int, default=0); i_rw = Field(int, default=0)
    i_tr = Field(int, default=0); i_ty = Field(int, default=0)
    i_op = Field(int, default=0); i_opi = Field(int, default=0)
    i_rgg = Field(int, default=0); i_rglp = Field(int, default=0)

    d_rr = Field(int, default=0); d_rp = Field(int, default=0); d_rw = Field(int, default=0)
    d_tr = Field(int, default=0); d_ty = Field(int, default=0)
    d_op = Field(int, default=0); d_opi = Field(int, default=0)
    d_rgg = Field(int, default=0); d_rglp = Field(int, default=0)

class Link(Fact):
    child = Field(int); parent = Field(int); action = Field(str); rx = Field(int); ry = Field(int)

class TraceNode(Fact):
    id = Field(int)

class PrintStep(Fact):
    id = Field(int); step = Field(int)

class FindNext(Fact):
    parent = Field(int); step = Field(int)


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


def moves_between(x0: int, y0: int, x1: int, y1: int) -> list[tuple[str, int, int]]:
    out: list[tuple[str, int, int]] = []
    x, y = x0, y0
    while x < x1:
        x += 1
        out.append(("robot move right", x, y))
    while x > x1:
        x -= 1
        out.append(("robot move left", x, y))
    while y < y1:
        y += 1
        out.append(("robot move down", x, y))
    while y > y1:
        y -= 1
        out.append(("robot move up", x, y))
    return out


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


def format_path_step(
    prev: dict[str, int] | None,
    rx: int,
    ry: int,
    g: int,
    action: str,
    state: str,
) -> list[str]:
    lines: list[str] = []
    prev_g = prev["g"] if prev else 0
    prev_x = prev["x"] if prev else rx
    prev_y = prev["y"] if prev else ry
    delta = g - prev_g

    command, detail = classify_action(action)
    if command == "robot start":
        lines.append(f"robot start | {detail} | pos=({rx},{ry}) | +0 | g={g}")
        return lines

    moves = moves_between(prev_x, prev_y, rx, ry)
    extra = action_extra_cost(command)
    move_cost = max(0, delta - extra)
    running_g = prev_g

    if moves:
        increments = distribute_cost(move_cost, len(moves))
        for (label, mx, my), inc in zip(moves, increments):
            running_g += inc
            lines.append(f"{label} | pos=({mx},{my}) | +{inc} | g={running_g}")

    if command:
        inc = g - running_g
        parts = [command]
        if detail:
            parts.append(detail)
        parts.extend([f"state={state}", f"pos=({rx},{ry})", f"+{inc}", f"g={g}"])
        lines.append(" | ".join(parts))

    return lines

# ==========================================
# 2. PURE MATH HELPERS (Zero Control Flow)
# ==========================================

def calc_h(dr1, dr2, dr3, dt1, dt2, do1, do2, dg1, dg2, rx, ry):
    rem1 = (2-dr1) + (1-dr2) + (1-dr3)
    rem2 = (3-dt1) + (1-dt2)
    rem3 = (2-do1) + (1-do2)
    rem4 = (2-dg1) + (2-dg2)

    dist1 = (abs(rx - 2) + abs(ry - 4)) * (rem1 > 0) + 999 * (rem1 == 0)
    dist2 = (abs(rx - 4) + abs(ry - 3)) * (rem2 > 0) + 999 * (rem2 == 0)
    dist3 = (abs(rx - 4) + abs(ry - 5)) * (rem3 > 0) + 999 * (rem3 == 0)
    dist4 = (abs(rx - 5) + abs(ry - 2)) * (rem4 > 0) + 999 * (rem4 == 0)

    m = min(dist1, dist2, dist3, dist4)
    return m * (m != 999)

def calc_bc(tot_d, tot_i):
    # FIXED: Exactly 15 items in the simulation, not 16.
    tot_rem = (15 - tot_d - tot_i)
    tot_rem = tot_rem * (tot_rem > 0)
    trips = math.ceil(tot_rem / 4.0)
    return int((trips * 6 - 2) * (trips > 0)) * TOGGLE_BESTCASE

def is_invalid_load(r1,r2,r3, t1,t2, o1,o2, g1,g2):
    types = ((r1+r2+r3)>0) + ((t1+t2)>0) + ((o1+o2)>0) + ((g1+g2)>0)
    colors = ((r1+t1)>0) + ((r2+o2)>0) + (r3>0) + (t2>0) + (o1>0) + (g1>0) + (g2>0)
    return (types > 1) * (colors > 1)

def can_load(li, target_li, inv, deliv, max_need, tot_i):
    return (li <= target_li) * ((inv + deliv) < max_need) * (tot_i < 4)

# ==========================================
# 3. THE RULE ENGINE
# ==========================================

class FlowerDeliveryEngine(KnowledgeEngine):
    def __init__(
        self,
        message_queue: Optional[Queue] = None,
        pretest_data: Optional[dict] = None,
        live_mode: bool = False,
    ):
        super().__init__()
        self.node_counter = 0
        self.message_queue = message_queue
        self.pretest_data = pretest_data or DEFAULT_PRETEST
        self.live_mode = live_mode or message_queue is not None
        self._path_prev: dict[str, int] | None = None
        self._path_commands: list[str] = []

    def next_id(self):
        self.node_counter += 1
        return self.node_counter

    def emit(self, event_type: str, data: dict[str, Any]):
        if self.message_queue is not None:
            self.message_queue.put({"event": event_type, "data": data})

    def clone_node(self, node, new_state, add_g=0, **kwargs):
        defaults = {
            "i_rr": 0, "i_rp": 0, "i_rw": 0, "i_tr": 0, "i_ty": 0,
            "i_op": 0, "i_opi": 0, "i_rgg": 0, "i_rglp": 0,
            "d_rr": 0, "d_rp": 0, "d_rw": 0, "d_tr": 0, "d_ty": 0,
            "d_op": 0, "d_opi": 0, "d_rgg": 0, "d_rglp": 0,
            "tot_i": 0, "tot_d": 0, "last_item": 1,
        }
        d = {**defaults, **dict(node)}
        del d["__factid__"]
        d.update(kwargs)

        d['id'] = self.next_id()
        d['pid'] = node['id']
        d['state'] = new_state
        d['status'] = "open"
        d['g'] += add_g
        d['h'] = calc_h(d['d_rr'], d['d_rp'], d['d_rw'], d['d_tr'], d['d_ty'], d['d_op'], d['d_opi'], d['d_rgg'], d['d_rglp'], d['rx'], d['ry'])
        d['bc'] = calc_bc(d['tot_d'], d['tot_i'])
        d['f'] = d['g'] + max(d['h'], d['bc'])
        self.declare(SearchNode(**d))

    @Rule(SystemControl(phase="search"), AS.node << SearchNode(status="open", id=MATCH.id, action=MATCH.act, f=MATCH.f, bc=MATCH.bc), salience=10000)
    def log_generated(self, id, act, f, bc):
        if not self.live_mode:
            print(f"[GENERATE] Node #{id:3} | f={f:2} (bc={bc:2}) | {act}")

    @Rule(SystemControl(phase="search"), AS.node << SearchNode(status="active", id=MATCH.id, state=MATCH.state), salience=10000)
    def log_activated(self, id, state):
        if not self.live_mode:
            print(f">>> [ACTIVE] Node #{id:3} picked for processing (State: {state})")

    @Rule(SystemControl(phase="search"), AS.node << SearchNode(status="dead", id=MATCH.id), salience=10000)
    def log_pruned(self, id):
        if not self.live_mode:
            print(f"XXX [PRUNED] Node #{id:3} killed by upper bounds or load constraints")

    @Rule(
        SystemControl(phase="search"),
        AS.candidate << SearchNode(status="open", f=MATCH.f1),
        NOT(SearchNode(status="open", f=TEST(lambda f: f < MATCH.f1))),
        salience=1000
    )
    def activate_node(self, candidate):
        self.modify(candidate, status="active")

    @Rule(
        SystemControl(phase="search"),
        AS.node << SearchNode(status="open", g=MATCH.g, bc=MATCH.bc),
        SystemMeta(upper_bound=MATCH.ub),
        TEST(lambda g, bc, ub: (g + bc) > ub),
        salience=2000
    )
    def prune_bounds(self, node):
        self.modify(node, status="dead")
        if self.live_mode:
            self.emit("NODE_PRUNED", {"reason": "bounds", **node_to_dict(node)})

    @Rule(
        SystemControl(phase="search"),
        AS.node << SearchNode(status="open",
            i_rr=MATCH.r1, i_rp=MATCH.r2, i_rw=MATCH.r3, i_tr=MATCH.t1, i_ty=MATCH.t2,
            i_op=MATCH.o1, i_opi=MATCH.o2, i_rgg=MATCH.g1, i_rglp=MATCH.g2),
        TEST(lambda r1,r2,r3,t1,t2,o1,o2,g1,g2: is_invalid_load(r1,r2,r3,t1,t2,o1,o2,g1,g2) == 1),
        salience=2500
    )
    def enforce_rules(self, node):
        self.modify(node, status="dead")
        if self.live_mode:
            self.emit("NODE_PRUNED", {"reason": "load_rules", **node_to_dict(node)})

    @Rule(SystemControl(phase="search"), AS.node << SearchNode(status="active", state="collect", rx=MATCH.rx, ry=MATCH.ry))
    def rule_collect(self, node, rx, ry):
        dist = abs(rx - 3) + abs(ry - 2)
        self.clone_node(node, "load", add_g=dist, rx=3, ry=2, action="Traveled to warehouse")
        self.modify(node, status="expanded")

    @Rule(SystemControl(phase="search"), AS.node << SearchNode(status="active", state="load", last_item=MATCH.li, tot_i=MATCH.ti, i_rr=MATCH.inv, d_rr=MATCH.drr), TEST(lambda li, ti, inv, drr: can_load(li, 1, inv, drr, 2, ti) == 1), salience=100)
    def l1(self, node, ti, inv): self.clone_node(node, "load", last_item=1, tot_i=ti+1, i_rr=inv+1, action="Loaded: Rose red")

    @Rule(SystemControl(phase="search"), AS.node << SearchNode(status="active", state="load", last_item=MATCH.li, tot_i=MATCH.ti, i_rp=MATCH.inv, d_rp=MATCH.drp), TEST(lambda li, ti, inv, drp: can_load(li, 2, inv, drp, 1, ti) == 1), salience=100)
    def l2(self, node, ti, inv): self.clone_node(node, "load", last_item=2, tot_i=ti+1, i_rp=inv+1, action="Loaded: Rose pink")

    @Rule(SystemControl(phase="search"), AS.node << SearchNode(status="active", state="load", last_item=MATCH.li, tot_i=MATCH.ti, i_rw=MATCH.inv, d_rw=MATCH.drw), TEST(lambda li, ti, inv, drw: can_load(li, 3, inv, drw, 1, ti) == 1), salience=100)
    def l3(self, node, ti, inv): self.clone_node(node, "load", last_item=3, tot_i=ti+1, i_rw=inv+1, action="Loaded: Rose white")

    @Rule(SystemControl(phase="search"), AS.node << SearchNode(status="active", state="load", last_item=MATCH.li, tot_i=MATCH.ti, i_tr=MATCH.inv, d_tr=MATCH.dtr), TEST(lambda li, ti, inv, dtr: can_load(li, 4, inv, dtr, 3, ti) == 1), salience=100)
    def l4(self, node, ti, inv): self.clone_node(node, "load", last_item=4, tot_i=ti+1, i_tr=inv+1, action="Loaded: Tulip red")

    @Rule(SystemControl(phase="search"), AS.node << SearchNode(status="active", state="load", last_item=MATCH.li, tot_i=MATCH.ti, i_ty=MATCH.inv, d_ty=MATCH.dty), TEST(lambda li, ti, inv, dty: can_load(li, 5, inv, dty, 1, ti) == 1), salience=100)
    def l5(self, node, ti, inv): self.clone_node(node, "load", last_item=5, tot_i=ti+1, i_ty=inv+1, action="Loaded: Tulip yellow")

    @Rule(SystemControl(phase="search"), AS.node << SearchNode(status="active", state="load", last_item=MATCH.li, tot_i=MATCH.ti, i_op=MATCH.inv, d_op=MATCH.dop), TEST(lambda li, ti, inv, dop: can_load(li, 6, inv, dop, 2, ti) == 1), salience=100)
    def l6(self, node, ti, inv): self.clone_node(node, "load", last_item=6, tot_i=ti+1, i_op=inv+1, action="Loaded: Orchid purple")

    @Rule(SystemControl(phase="search"), AS.node << SearchNode(status="active", state="load", last_item=MATCH.li, tot_i=MATCH.ti, i_opi=MATCH.inv, d_opi=MATCH.dopi), TEST(lambda li, ti, inv, dopi: can_load(li, 7, inv, dopi, 1, ti) == 1), salience=100)
    def l7(self, node, ti, inv): self.clone_node(node, "load", last_item=7, tot_i=ti+1, i_opi=inv+1, action="Loaded: Orchid pink")

    @Rule(SystemControl(phase="search"), AS.node << SearchNode(status="active", state="load", last_item=MATCH.li, tot_i=MATCH.ti, i_rgg=MATCH.inv, d_rgg=MATCH.drgg), TEST(lambda li, ti, inv, drgg: can_load(li, 8, inv, drgg, 2, ti) == 1), salience=100)
    def l8(self, node, ti, inv): self.clone_node(node, "load", last_item=8, tot_i=ti+1, i_rgg=inv+1, action="Loaded: RG gold")

    @Rule(SystemControl(phase="search"), AS.node << SearchNode(status="active", state="load", last_item=MATCH.li, tot_i=MATCH.ti, i_rglp=MATCH.inv, d_rglp=MATCH.drglp), TEST(lambda li, ti, inv, drglp: can_load(li, 9, inv, drglp, 2, ti) == 1), salience=100)
    def l9(self, node, ti, inv): self.clone_node(node, "load", last_item=9, tot_i=ti+1, i_rglp=inv+1, action="Loaded: RG light pink")

    @Rule(SystemControl(phase="search"), AS.node << SearchNode(status="active", state="load", tot_i=MATCH.ti), TEST(lambda ti: ti > 0), salience=100)
    def dispatch_deliv(self, node):
        self.clone_node(node, "deliver", add_g=1, action="Finished loading. Dispatched.")

    @Rule(SystemControl(phase="search"), AS.node << SearchNode(status="active", state="load"), salience=50)
    def close_load(self, node): self.modify(node, status="expanded")

    @Rule(SystemControl(phase="search"), AS.node << SearchNode(status="active", state="deliver", i_rr=MATCH.r1, i_rp=MATCH.r2, i_rw=MATCH.r3, d_rr=MATCH.d1, d_rp=MATCH.d2, d_rw=MATCH.d3), TEST(lambda r1,r2,r3,d1,d2,d3: ((r1>0)*(d1<2) + (r2>0)*(d2<1) + (r3>0)*(d3<1)) > 0), salience=100)
    def route_p1(self, node): self.clone_node(node, "unload", add_g=3, rx=2, ry=4, action="Routed to P1")

    @Rule(SystemControl(phase="search"), AS.node << SearchNode(status="active", state="deliver", i_tr=MATCH.t1, i_ty=MATCH.t2, d_tr=MATCH.d1, d_ty=MATCH.d2), TEST(lambda t1,t2,d1,d2: ((t1>0)*(d1<3) + (t2>0)*(d2<1)) > 0), salience=100)
    def route_p2(self, node): self.clone_node(node, "unload", add_g=2, rx=4, ry=3, action="Routed to P2")

    @Rule(SystemControl(phase="search"), AS.node << SearchNode(status="active", state="deliver", i_op=MATCH.o1, i_opi=MATCH.o2, d_op=MATCH.d1, d_opi=MATCH.d2), TEST(lambda o1,o2,d1,d2: ((o1>0)*(d1<2) + (o2>0)*(d2<1)) > 0), salience=100)
    def route_p3(self, node): self.clone_node(node, "unload", add_g=4, rx=4, ry=5, action="Routed to P3")

    @Rule(SystemControl(phase="search"), AS.node << SearchNode(status="active", state="deliver", i_rgg=MATCH.g1, i_rglp=MATCH.g2, d_rgg=MATCH.d1, d_rglp=MATCH.d2), TEST(lambda g1,g2,d1,d2: ((g1>0)*(d1<2) + (g2>0)*(d2<2)) > 0), salience=100)
    def route_p4(self, node): self.clone_node(node, "unload", add_g=2, rx=5, ry=2, action="Routed to P4")

    @Rule(SystemControl(phase="search"), AS.node << SearchNode(status="active", state="deliver"), salience=50)
    def close_deliv(self, node): self.modify(node, status="expanded")

    @Rule(
        SystemControl(phase="search"),
        AS.node << SearchNode(
            status="active", state="unload", rx=MATCH.rx, ry=MATCH.ry, tot_i=MATCH.ti, tot_d=MATCH.td,
            i_rr=MATCH.r1, i_rp=MATCH.r2, i_rw=MATCH.r3,
            i_tr=MATCH.t1, i_ty=MATCH.t2,
            i_op=MATCH.o1, i_opi=MATCH.o2,
            i_rgg=MATCH.g1, i_rglp=MATCH.g2,
            d_rr=MATCH.dr1, d_rp=MATCH.dr2, d_rw=MATCH.dr3,
            d_tr=MATCH.dt1, d_ty=MATCH.dt2,
            d_op=MATCH.do1, d_opi=MATCH.do2,
            d_rgg=MATCH.dg1, d_rglp=MATCH.dg2
        )
    )
    def process_unload(self, node, rx, ry, ti, td, r1,r2,r3, t1,t2, o1,o2, g1,g2, dr1,dr2,dr3, dt1,dt2, do1,do2, dg1,dg2):
        at_p1 = (rx == 2) * (ry == 4); at_p2 = (rx == 4) * (ry == 3)
        at_p3 = (rx == 4) * (ry == 5); at_p4 = (rx == 5) * (ry == 2)

        dp_r1 = min(r1, 2 - dr1) * at_p1; dp_r2 = min(r2, 1 - dr2) * at_p1; dp_r3 = min(r3, 1 - dr3) * at_p1
        dp_t1 = min(t1, 3 - dt1) * at_p2; dp_t2 = min(t2, 1 - dt2) * at_p2
        dp_o1 = min(o1, 2 - do1) * at_p3; dp_o2 = min(o2, 1 - do2) * at_p3
        dp_g1 = min(g1, 2 - dg1) * at_p4; dp_g2 = min(g2, 2 - dg2) * at_p4

        tot_drop = dp_r1+dp_r2+dp_r3+dp_t1+dp_t2+dp_o1+dp_o2+dp_g1+dp_g2
        unld_any = (tot_drop > 0)

        new_ti = ti - tot_drop
        new_td = td + tot_drop

        # FIXED: Exactly 15 items in the simulation, not 16.
        next_s = "done" * (new_td == 15) + "collect" * ((new_td < 15) * (new_ti == 0)) + "deliver" * ((new_td < 15) * (new_ti > 0))

        self.clone_node(node, next_s, add_g=1 * unld_any, action="Unloaded matching cargo",
            tot_i=new_ti, tot_d=new_td, last_item=1,
            i_rr=r1-dp_r1, i_rp=r2-dp_r2, i_rw=r3-dp_r3, i_tr=t1-dp_t1, i_ty=t2-dp_t2, i_op=o1-dp_o1, i_opi=o2-dp_o2, i_rgg=g1-dp_g1, i_rglp=g2-dp_g2,
            d_rr=dr1+dp_r1, d_rp=dr2+dp_r2, d_rw=dr3+dp_r3, d_tr=dt1+dp_t1, d_ty=dt2+dp_t2, d_op=do1+dp_o1, d_opi=do2+dp_o2, d_rgg=dg1+dp_g1, d_rglp=dg2+dp_g2)

        self.modify(node, status="expanded")

    # ==========================================
    # 4. FORWARD-CHAINING PATH MACHINE
    # ==========================================

    @Rule(AS.ctrl << SystemControl(phase="search"), SearchNode(status="active", state="done", id=MATCH.gid, g=MATCH.g, f=MATCH.f), salience=5000)
    def goal_found(self, ctrl, gid, g, f):
        if self.live_mode:
            self.emit("GOAL", {
                "node_id": gid,
                "g_n": g,
                "f_n": f,
                "message": f"Optimal solution acquired by node #{gid}",
            })
            nodes = sorted(
                filter(lambda fact: isinstance(fact, SearchNode), self.facts.values()),
                key=lambda n: n["id"],
            )
            self.emit("SEARCH_TREE", {"nodes": [node_to_dict(n) for n in nodes]})
        else:
            print(f"\n[GOAL] OPTIMAL SOLUTION ACQUIRED BY NODE #{gid}")
        self.modify(ctrl, phase="trace_back")
        self.declare(TraceNode(id=gid))

    @Rule(SystemControl(phase="trace_back"), AS.tn << TraceNode(id=MATCH.curr), SearchNode(id=MATCH.curr, pid=MATCH.pid, action=MATCH.act, rx=MATCH.rx, ry=MATCH.ry))
    def trace_back(self, tn, curr, pid, act, rx, ry):
        self.declare(Link(child=curr, parent=pid, action=act, rx=rx, ry=ry))
        self.retract(tn)
        self.declare(TraceNode(id=pid))

    @Rule(AS.ctrl << SystemControl(phase="trace_back"), AS.tn << TraceNode(id=0))
    def start_print(self, ctrl, tn):
        self.retract(tn)
        self.modify(ctrl, phase="print_fwd")
        self._path_prev = None
        self._path_commands = []
        if self.live_mode:
            steps = len(list(filter(lambda fact: isinstance(fact, Link), self.facts.values())))
            self.emit("TIMELINE_START", {"steps": steps})
        else:
            print("\n--- OPTIMAL ROBOT COMMAND TRACE ---")
        self.declare(PrintStep(id=1, step=0))

    @Rule(
        SystemControl(phase="print_fwd"),
        AS.ps << PrintStep(id=MATCH.curr, step=MATCH.step),
        Link(child=MATCH.curr, action=MATCH.act, rx=MATCH.rx, ry=MATCH.ry),
        SearchNode(id=MATCH.curr, g=MATCH.g, f=MATCH.f, state=MATCH.state),
    )
    def print_forward(self, ps, curr, step, act, rx, ry, g, f, state):
        for line in format_path_step(self._path_prev, rx, ry, g, act, state):
            self._path_commands.append(line)
            if self.live_mode:
                self.emit("PATH_COMMAND", {"step": step, "line": line, "g_n": g, "f_n": f})
            else:
                print(line)

        if self.live_mode:
            self.emit("ROBOT_MOVE", {
                "step": step,
                "id": curr,
                "to_x": rx,
                "to_y": ry,
                "state": state,
                "action": act,
                "g_n": g,
                "f_n": f,
            })
            self.emit("TIMELINE_STEP", {
                "step": step,
                "node_id": curr,
                "action": act,
                "pos": [rx, ry],
                "state": state,
                "g_n": g,
                "f_n": f,
            })

        self._path_prev = {"x": rx, "y": ry, "g": g}
        self.retract(ps)
        self.declare(FindNext(parent=curr, step=step+1))

    @Rule(SystemControl(phase="print_fwd"), AS.fn << FindNext(parent=MATCH.p, step=MATCH.s), Link(child=MATCH.c, parent=MATCH.p))
    def do_find_next(self, fn, p, s, c):
        self.retract(fn)
        self.declare(PrintStep(id=c, step=s))

    @Rule(SystemControl(phase="print_fwd"), AS.fn << FindNext(parent=MATCH.p, step=MATCH.s), NOT(Link(parent=MATCH.p)))
    def end_print(self, fn, p, s):
        self.retract(fn)
        total_cost = self._path_prev["g"] if self._path_prev else 0
        summary = f"total cost g={total_cost} | commands={len(self._path_commands)}"
        if self.live_mode:
            self.emit("PATH_TRACE", {"lines": self._path_commands, "total_cost": total_cost})
        else:
            print(summary)
        self.halt()

    # ==========================================
    # 5. ENGINE STARTUP
    # ==========================================

    def startup(self):
        self.reset()
        meta, pavilions, start_x, start_y = parse_pretest(self.pretest_data)

        if self.live_mode:
            self.emit("BOARD_SETUP", self.pretest_data)

        strict_ub = calc_strict_upper_bound(
            pavilions,
            start_x,
            start_y,
            meta["warehouse_x"],
            meta["warehouse_y"],
        )

        self.declare(SystemControl(phase="search"))
        self.declare(SystemMeta(upper_bound=strict_ub, max_load=meta["max_load"]))

        self.declare(SearchNode(
            id=self.next_id(), pid=0, state="collect", status="open", rx=start_x, ry=start_y,
            g=0, h=calc_h(0,0,0,0,0,0,0,0,0,start_x,start_y), f=calc_bc(0, 0), bc=calc_bc(0, 0),
            action="System Frame Initialization"
        ))
        self.run()

        if self.live_mode:
            self.emit("DONE", {"message": "Execution finished"})

if __name__ == "__main__":
    engine = FlowerDeliveryEngine()
    engine.startup()
