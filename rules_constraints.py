from experta import AS, MATCH, NOT, Rule, TEST

from facts import SearchNode, SystemControl, SystemMeta
from helpers import is_invalid_load, node_to_dict


class ConstraintRules:
    @Rule(
        SystemControl(phase="search"),
        AS.node << SearchNode(status="open", g=MATCH.g, bc=MATCH.bc),
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
        SystemMeta(max_load=MATCH.limit),
        AS.node << SearchNode(status="open", tot_i=MATCH.total_inventory),
        TEST(lambda limit, total_inventory: total_inventory > limit),
        salience=10000,
    )
    def prune_overloaded_robot(self, node):
        self.modify(node, status="dead")
        if self.live_mode:
            self.emit("NODE_PRUNED", {"reason": "overloaded", **node_to_dict(node)})

    @Rule(
        SystemControl(phase="search"),
        AS.node << SearchNode(
            status="open",
            i_rr=MATCH.r1,
            i_rp=MATCH.r2,
            i_rw=MATCH.r3,
            i_tr=MATCH.t1,
            i_ty=MATCH.t2,
            i_op=MATCH.o1,
            i_opi=MATCH.o2,
            i_rgg=MATCH.g1,
            i_rglp=MATCH.g2,
        ),
        TEST(lambda r1, r2, r3, t1, t2, o1, o2, g1, g2: is_invalid_load(r1, r2, r3, t1, t2, o1, o2, g1, g2) == 1),
        salience=2500,
    )
    def prune_invalid_mix(self, node):
        self.modify(node, status="dead")
        if self.live_mode:
            self.emit("NODE_PRUNED", {"reason": "load_rules", **node_to_dict(node)})
