import math
from queue import Queue
from typing import Any, Optional

from experta import *

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


class SystemControl(Fact):
    phase = Field(str, default="search")


class SystemMeta(Fact):
    upper_bound = Field(int, mandatory=True)
    max_load = Field(int, mandatory=True)
    warehouse_x = Field(int, default=3)
    warehouse_y = Field(int, default=2)


class SearchNode(Fact):
    node_id = Field(int, mandatory=True)
    parent_id = Field(int, mandatory=True)
    robot_x = Field(int, mandatory=True)
    robot_y = Field(int, mandatory=True)
    robot_state = Field(str, mandatory=True)
    status = Field(str, default="open")
    carried_bouquets = Field(tuple, default=())
    pavilions = Field(tuple, mandatory=True)
    g_n = Field(int, default=0)
    h_n = Field(int, default=0)
    f_n = Field(int, default=0)
    bestcase_n = Field(int, default=0)
    last_action = Field(str, default="spawn")


def calc_strict_upper_bound(pavilions, start_x, start_y, wx, wy):
    """
    Calculates the true ceiling cost:
    Start Dist + Sum(Round Trips) + Load/Unload Tax - Longest Return Trip
    """
    unique_p = list({(p[1], p[2]) for p in pavilions if p[5] > 0})
    distances = list(map(lambda pos: abs(wx - pos[0]) + abs(wy - pos[1]), unique_p))
    start_dist = abs(start_x - wx) + abs(start_y - wy)
    round_trips = sum(map(lambda d: d * 2, distances))
    action_tax = len(distances) * 2
    longest_dist = max(distances or [0])
    return start_dist + round_trips + action_tax - longest_dist


def calc_bestcase(pavilions, max_load, wx, wy):
    if TOGGLE_BESTCASE == 0:
        return 0

    total_need = 0
    distances = []

    for p in pavilions:
        _pid, px, py, _ptype, _pcolor, needed, delivered = p
        if needed > delivered:
            total_need += (needed - delivered)
            distances.append(abs(wx - px) + abs(wy - py))

    if total_need == 0:
        return 0

    n = math.ceil(total_need / max_load)
    distances.sort()

    bestcase_cost = 0
    for i in range(min(n, len(distances))):
        bestcase_cost += (distances[i] * 2 + 2)

    return bestcase_cost * TOGGLE_BESTCASE


def calc_manhattan(x1, y1, x2, y2):
    return abs(x1 - x2) + abs(y1 - y2)


def calc_heuristic_hn(pavilions, cx, cy):
    unfulfilled = list(filter(lambda p: p[5] > p[6], pavilions))
    distances = list(map(lambda p: calc_manhattan(cx, cy, p[1], p[2]), unfulfilled))
    return {True: 0, False: min(distances or [0])}[len(distances) == 0]


def get_possible_loads(pavilions, inventory, max_load):
    current_total = sum(map(lambda i: i[2], inventory))
    space_left = max_load - current_total
    in_cart = lambda ft, c: sum(map(lambda i: i[2], filter(lambda i: i[0] == ft and i[1] == c, inventory)))
    active_p = list(filter(lambda p: (p[5] - p[6] - in_cart(p[3], p[4])) > 0, pavilions))
    make_opts = lambda p: map(lambda q: (p[3], p[4], q), range(1, min(p[5] - p[6] - in_cart(p[3], p[4]), space_left) + 1))
    raw_opts = sum(map(list, map(make_opts, active_p)), [])
    return {True: [], False: list(dict.fromkeys(raw_opts))}[space_left <= 0]


def trace_path_recursive(current_id, fact_map):
    return [fact_map[current_id]] + trace_path_recursive(fact_map[current_id]["parent_id"], fact_map) if current_id in fact_map else []


def parse_pretest(pretest_data: dict) -> tuple[dict, tuple, int, int]:
    meta = pretest_data["meta"]
    pavilions = tuple(
        (p["pid"], p["x"], p["y"], p["type"], p["color"], p["needed"], p["delivered"])
        for p in pretest_data["pavilions"]
    )
    start_x = meta.get("start_x", 3)
    start_y = meta.get("start_y", 1)
    return meta, pavilions, start_x, start_y


def node_to_dict(node: SearchNode) -> dict[str, Any]:
    return {
        "node_id": node["node_id"],
        "parent_id": node["parent_id"],
        "robot_x": node["robot_x"],
        "robot_y": node["robot_y"],
        "robot_state": node["robot_state"],
        "status": node["status"],
        "f_n": node["f_n"],
        "g_n": node["g_n"],
        "h_n": node["h_n"],
        "last_action": node["last_action"],
    }


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

    def next_id(self):
        self.node_counter += 1
        return self.node_counter

    def emit(self, event_type: str, data: dict[str, Any]):
        if self.message_queue is not None:
            self.message_queue.put({"event": event_type, "data": data})

    @Rule(
        SystemControl(phase="search"),
        AS.candidate << SearchNode(status="open", f_n=MATCH.f1),
        NOT(SearchNode(status="open", f_n=TEST(lambda f: f < MATCH.f1))),
        salience=1000,
    )
    def activate_node(self, candidate):
        self.modify(candidate, status="active")

    @Rule(
        SystemControl(phase="search"),
        AS.node << SearchNode(status="open", g_n=MATCH.g, bestcase_n=MATCH.bc),
        SystemMeta(upper_bound=MATCH.ub),
        TEST(lambda g, bc, ub: (g + bc) > ub),
        salience=2000,
    )
    def prune_bounds(self, node):
        self.modify(node, status="dead")
        if self.live_mode:
            self.emit("NODE_PRUNED", {"reason": "bounds", **node_to_dict(node)})

    @Rule(
        SystemControl(phase="search"),
        AS.node << SearchNode(status="open", robot_state="load", carried_bouquets=MATCH.cb),
        TEST(lambda cb: len(set(map(lambda i: i[0], cb))) > 1 and len(set(map(lambda i: i[1], cb))) > 1),
        salience=2500,
    )
    def enforce_load_rules(self, node):
        self.modify(node, status="dead")
        if self.live_mode:
            self.emit("NODE_PRUNED", {"reason": "load_rules", **node_to_dict(node)})

    @Rule(
        SystemControl(phase="search"),
        AS.node << SearchNode(status="active", robot_state="collect", robot_x=MATCH.rx, robot_y=MATCH.ry, g_n=MATCH.g, pavilions=MATCH.p, carried_bouquets=MATCH.cb),
        SystemMeta(max_load=MATCH.ml, warehouse_x=MATCH.wx, warehouse_y=MATCH.wy),
        salience=100,
    )
    def action_collect(self, node, rx, ry, g, p, cb, ml, wx, wy):
        cost = calc_manhattan(rx, ry, wx, wy)
        h = calc_heuristic_hn(p, wx, wy)
        bc = calc_bestcase(p, ml, wx, wy)
        new_node_id = self.next_id()
        self.declare(
            SearchNode(
                node_id=new_node_id,
                parent_id=node["node_id"],
                robot_x=wx,
                robot_y=wy,
                robot_state="load",
                status="open",
                carried_bouquets=cb,
                pavilions=p,
                g_n=g + cost,
                h_n=h,
                f_n=(g + cost) + h,
                bestcase_n=bc,
                last_action=f"Traveled to warehouse (Cost: {cost})",
            )
        )
        self.modify(node, status="expanded")

    @Rule(
        SystemControl(phase="search"),
        AS.node << SearchNode(status="active", robot_state="load", carried_bouquets=MATCH.cb, pavilions=MATCH.p, g_n=MATCH.g),
        SystemMeta(max_load=MATCH.ml, warehouse_x=MATCH.wx, warehouse_y=MATCH.wy),
        salience=100,
    )
    def action_load(self, node, cb, p, g, ml, wx, wy):
        options = get_possible_loads(p, cb, ml)
        h = calc_heuristic_hn(p, wx, wy)
        bc = calc_bestcase(p, ml, wx, wy)

        list(
            map(
                lambda item: self.declare(
                    SearchNode(
                        node_id=self.next_id(),
                        parent_id=node["node_id"],
                        robot_x=wx,
                        robot_y=wy,
                        robot_state="load",
                        status="open",
                        carried_bouquets=cb + (item,),
                        pavilions=p,
                        g_n=g,
                        h_n=h,
                        f_n=g + h,
                        bestcase_n=bc,
                        last_action=f"Loaded: Type={item[0]}, Color={item[1]}, Qty={item[2]}",
                    )
                ),
                options,
            )
        )

        depart_g = g + {True: 1, False: 0}[len(cb) > 0]
        self.declare(
            SearchNode(
                node_id=self.next_id(),
                parent_id=node["node_id"],
                robot_x=wx,
                robot_y=wy,
                robot_state="deliver",
                status="open",
                carried_bouquets=cb,
                pavilions=p,
                g_n=depart_g,
                h_n=h,
                f_n=depart_g + h,
                bestcase_n=bc,
                last_action="Finished loading. Dispatched for delivery.",
            )
        )
        self.modify(node, status="expanded")

    @Rule(
        SystemControl(phase="search"),
        AS.node << SearchNode(status="active", robot_state="deliver", carried_bouquets=MATCH.cb, pavilions=MATCH.p, g_n=MATCH.g, robot_x=MATCH.rx, robot_y=MATCH.ry),
        SystemMeta(max_load=MATCH.ml, warehouse_x=MATCH.wx, warehouse_y=MATCH.wy),
        salience=100,
    )
    def action_deliver(self, node, cb, p, g, rx, ry, ml, wx, wy):
        matching = filter(lambda pav: any(map(lambda i: i[0] == pav[3], cb)) and pav[5] > pav[6], p)
        targets = dict(map(lambda pav: (pav[0], (pav[1], pav[2])), matching))
        bc = calc_bestcase(p, ml, wx, wy)

        list(
            map(
                lambda t: self.declare(
                    SearchNode(
                        node_id=self.next_id(),
                        parent_id=node["node_id"],
                        robot_x=t[1][0],
                        robot_y=t[1][1],
                        robot_state="unload",
                        status="open",
                        carried_bouquets=cb,
                        pavilions=p,
                        g_n=g + calc_manhattan(rx, ry, t[1][0], t[1][1]),
                        h_n=calc_heuristic_hn(p, t[1][0], t[1][1]),
                        f_n=(g + calc_manhattan(rx, ry, t[1][0], t[1][1])) + calc_heuristic_hn(p, t[1][0], t[1][1]),
                        bestcase_n=bc,
                        last_action=f"Routed directly to Pavilion {t[0]}",
                    )
                ),
                targets.items(),
            )
        )
        self.modify(node, status="expanded")

    @Rule(
        SystemControl(phase="search"),
        AS.node << SearchNode(status="active", robot_state="unload", robot_x=MATCH.rx, robot_y=MATCH.ry, carried_bouquets=MATCH.cb, pavilions=MATCH.p, g_n=MATCH.g),
        SystemMeta(max_load=MATCH.ml, warehouse_x=MATCH.wx, warehouse_y=MATCH.wy),
        salience=100,
    )
    def action_unload(self, node, rx, ry, cb, p, g, ml, wx, wy):
        unique_cargo = list(set(map(lambda i: (i[0], i[1]), cb)))
        get_need = lambda t, c: sum(map(lambda pav: pav[5] - pav[6], filter(lambda pav: pav[1] == rx and pav[2] == ry and pav[3] == t and pav[4] == c, p)))

        is_unloaded = lambda t, c: {
            True: sum(map(lambda i: i[2], filter(lambda i: i[0] == t and i[1] == c, cb))) >= get_need(t, c) and get_need(t, c) > 0,
            False: False,
        }[len(list(filter(lambda pav: pav[1] == rx and pav[2] == ry and pav[3] == t and pav[4] == c, p))) > 0]

        get_new_qty = lambda t, c: sum(map(lambda i: i[2], filter(lambda i: i[0] == t and i[1] == c, cb))) - {True: get_need(t, c), False: 0}[is_unloaded(t, c)]

        final_cargo = tuple(filter(lambda i: i[2] > 0, map(lambda pair: (pair[0], pair[1], get_new_qty(pair[0], pair[1])), unique_cargo)))
        unloaded_any = any(map(lambda pair: is_unloaded(pair[0], pair[1]), unique_cargo))

        updated_p = tuple(
            map(
                lambda pav: (
                    pav[0],
                    pav[1],
                    pav[2],
                    pav[3],
                    pav[4],
                    pav[5],
                    {True: pav[5], False: pav[6]}[pav[1] == rx and pav[2] == ry and is_unloaded(pav[3], pav[4])],
                ),
                p,
            )
        )

        cargo_empty = len(final_cargo) == 0
        all_fulfilled = all(map(lambda pst: pst[5] == pst[6], updated_p))
        bc = calc_bestcase(updated_p, ml, wx, wy)

        next_state = {
            (True, True): "done",
            (True, False): "collect",
            (False, True): "deliver",
            (False, False): "deliver",
        }[(cargo_empty, all_fulfilled)]

        self.declare(
            SearchNode(
                node_id=self.next_id(),
                parent_id=node["node_id"],
                robot_x=rx,
                robot_y=ry,
                robot_state=next_state,
                status="open",
                carried_bouquets=final_cargo,
                pavilions=updated_p,
                g_n=g + {True: 1, False: 0}[unloaded_any],
                h_n=calc_heuristic_hn(updated_p, rx, ry),
                f_n=(g + {True: 1, False: 0}[unloaded_any]) + calc_heuristic_hn(updated_p, rx, ry),
                bestcase_n=bc,
                last_action=f"Unloaded matching cargo. Next state: '{next_state}'",
            )
        )
        self.modify(node, status="expanded")

    @Rule(
        AS.ctrl << SystemControl(phase="search"),
        SearchNode(robot_state="done", status="active", node_id=MATCH.gid),
        salience=5000,
    )
    def goal_found(self, ctrl, gid):
        if self.live_mode:
            self.emit("GOAL", {"node_id": gid, "message": f"Optimal solution acquired by node #{gid}"})
        else:
            print(f"\n[GOAL] OPTIMAL SOLUTION ACQUIRED BY NODE #{gid}")
        self.modify(ctrl, phase="print_tree")

    @Rule(AS.ctrl << SystemControl(phase="print_tree"), salience=100)
    def print_tree(self, ctrl):
        nodes = list(filter(lambda f: isinstance(f, SearchNode), self.facts.values()))
        nodes.sort(key=lambda x: x["node_id"])

        if self.live_mode:
            self.emit("SEARCH_TREE", {"nodes": [node_to_dict(n) for n in nodes]})
        else:
            print("\n--- COMPREHENSIVE GENERATED SEARCH SPACE TREE ---")
            list(
                map(
                    lambda n: print(
                        f"Node #{n['node_id']:3} (Parent #{n['parent_id']:3}) | State: {n['robot_state']:8} | Status: {n['status']:8} | f(n)={n['f_n']:3} | Action: {n['last_action']}"
                    ),
                    nodes,
                )
            )
        self.modify(ctrl, phase="print_path")

    @Rule(SystemControl(phase="print_path"), SearchNode(robot_state="done", node_id=MATCH.gid), salience=50)
    def print_path(self, gid):
        fact_map = dict(map(lambda f: (f["node_id"], f), filter(lambda f: isinstance(f, SearchNode), self.facts.values())))
        path = trace_path_recursive(gid, fact_map)[::-1]

        if self.live_mode:
            self.emit("TIMELINE_START", {"steps": len(path)})
            for step_idx, step in enumerate(path):
                self.emit(
                    "ROBOT_MOVE",
                    {
                        "step": step_idx,
                        "id": step["node_id"],
                        "to_x": step["robot_x"],
                        "to_y": step["robot_y"],
                        "state": step["robot_state"],
                        "action": step["last_action"],
                    },
                )
                self.emit(
                    "TIMELINE_STEP",
                    {
                        "step": step_idx,
                        "node_id": step["node_id"],
                        "action": step["last_action"],
                        "pos": [step["robot_x"], step["robot_y"]],
                        "state": step["robot_state"],
                    },
                )
        else:
            print("\n--- TIMELINE MAP OF RUNTIME SUCCESS OPERATIONS ---")
            list(
                map(
                    lambda step: print(
                        f"Step {step[0]:2}: [Node #{step[1]['node_id']:3}] -> {step[1]['last_action']} | Pos: ({step[1]['robot_x']},{step[1]['robot_y']})"
                    ),
                    enumerate(path),
                )
            )
        self.halt()

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
        self.declare(
            SystemMeta(
                upper_bound=strict_ub,
                max_load=meta["max_load"],
                warehouse_x=meta["warehouse_x"],
                warehouse_y=meta["warehouse_y"],
            )
        )

        h = calc_heuristic_hn(pavilions, start_x, start_y)
        bc = calc_bestcase(pavilions, meta["max_load"], meta["warehouse_x"], meta["warehouse_y"])
        self.declare(
            SearchNode(
                node_id=self.next_id(),
                parent_id=0,
                robot_x=start_x,
                robot_y=start_y,
                robot_state="collect",
                status="open",
                pavilions=pavilions,
                g_n=0,
                h_n=h,
                f_n=h,
                bestcase_n=bc,
                last_action="System Frame Initialization",
            )
        )
        self.run()

        if self.live_mode:
            self.emit("DONE", {"message": "Execution finished"})
