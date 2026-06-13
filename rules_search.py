from experta import AS, MATCH, NOT, Rule, TEST

from facts import FindNext, Link, PrintStep, SearchNode, SystemControl, TraceNode
from helpers import node_to_dict


class SearchRules:
    @Rule(
        SystemControl(phase="search"),
        AS.node << SearchNode(status="open", id=MATCH.id, action=MATCH.act, f=MATCH.f, bc=MATCH.bc),
        salience=10000,
    )
    def log_generated(self, id, act, f, bc):
        if not self.live_mode:
            print(f"[GENERATE] Node #{id:3} | f={f:2} (bc={bc:2}) | {act}")

    @Rule(
        SystemControl(phase="search"),
        AS.node << SearchNode(status="active", id=MATCH.id, state=MATCH.state),
        salience=10000,
    )
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
        salience=1000,
    )
    def activate_node(self, candidate):
        self.modify(candidate, status="active")

    @Rule(
        AS.ctrl << SystemControl(phase="search"),
        SearchNode(status="active", state="done", id=MATCH.gid, g=MATCH.g, f=MATCH.f),
        salience=5000,
    )
    def goal_found(self, ctrl, gid, g, f):
        if self.live_mode:
            self.emit(
                "GOAL",
                {
                    "node_id": gid,
                    "g_n": g,
                    "f_n": f,
                    "message": f"Optimal solution acquired by node #{gid}",
                },
            )
            nodes = sorted(
                filter(lambda fact: isinstance(fact, SearchNode), self.facts.values()),
                key=lambda n: n["id"],
            )
            self.emit("SEARCH_TREE", {"nodes": [node_to_dict(n) for n in nodes]})
        else:
            print(f"\n[GOAL] OPTIMAL SOLUTION ACQUIRED BY NODE #{gid}")
        self.modify(ctrl, phase="trace_back")
        self.declare(TraceNode(id=gid))

    @Rule(
        SystemControl(phase="trace_back"),
        AS.tn << TraceNode(id=MATCH.curr),
        SearchNode(id=MATCH.curr, pid=MATCH.pid, action=MATCH.act, rx=MATCH.rx, ry=MATCH.ry),
    )
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
        AS.fn << FindNext(parent=MATCH.p, step=MATCH.s),
        Link(child=MATCH.c, parent=MATCH.p),
    )
    def do_find_next(self, fn, p, s, c):
        self.retract(fn)
        self.declare(PrintStep(id=c, step=s))

    @Rule(
        SystemControl(phase="print_fwd"),
        AS.fn << FindNext(parent=MATCH.p, step=MATCH.s),
        NOT(Link(parent=MATCH.p)),
    )
    def end_print(self, fn, p, s):
        self.retract(fn)
        total_cost = self._path_prev["g"] if self._path_prev else 0
        summary = f"total cost g={total_cost} | commands={len(self._path_commands)}"
        if self.live_mode:
            self.emit("PATH_TRACE", {"lines": self._path_commands, "total_cost": total_cost})
        else:
            print(summary)
        self.halt()
