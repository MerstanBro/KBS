from experta import AS, MATCH, Rule, TEST

from constants import TOTAL_DELIVERY_ITEMS
from facts import SearchNode, SystemControl, SystemMeta
from helpers import can_load


class InventoryRules:
    @Rule(
        SystemControl(phase="search"),
        AS.node << SearchNode(status="active", state="load", last_item=MATCH.li, tot_i=MATCH.ti, i_rr=MATCH.inv, d_rr=MATCH.drr),
        TEST(lambda li, ti, inv, drr: can_load(li, 1, inv, drr, 2, ti) == 1),
        salience=100,
    )
    def l1(self, node, ti, inv):
        self.clone_node(node, "load", last_item=1, tot_i=ti + 1, i_rr=inv + 1, action="Loaded: Rose red")

    @Rule(
        SystemControl(phase="search"),
        AS.node << SearchNode(status="active", state="load", last_item=MATCH.li, tot_i=MATCH.ti, i_rp=MATCH.inv, d_rp=MATCH.drp),
        TEST(lambda li, ti, inv, drp: can_load(li, 2, inv, drp, 1, ti) == 1),
        salience=100,
    )
    def l2(self, node, ti, inv):
        self.clone_node(node, "load", last_item=2, tot_i=ti + 1, i_rp=inv + 1, action="Loaded: Rose pink")

    @Rule(
        SystemControl(phase="search"),
        AS.node << SearchNode(status="active", state="load", last_item=MATCH.li, tot_i=MATCH.ti, i_rw=MATCH.inv, d_rw=MATCH.drw),
        TEST(lambda li, ti, inv, drw: can_load(li, 3, inv, drw, 1, ti) == 1),
        salience=100,
    )
    def l3(self, node, ti, inv):
        self.clone_node(node, "load", last_item=3, tot_i=ti + 1, i_rw=inv + 1, action="Loaded: Rose white")

    @Rule(
        SystemControl(phase="search"),
        AS.node << SearchNode(status="active", state="load", last_item=MATCH.li, tot_i=MATCH.ti, i_tr=MATCH.inv, d_tr=MATCH.dtr),
        TEST(lambda li, ti, inv, dtr: can_load(li, 4, inv, dtr, 3, ti) == 1),
        salience=100,
    )
    def l4(self, node, ti, inv):
        self.clone_node(node, "load", last_item=4, tot_i=ti + 1, i_tr=inv + 1, action="Loaded: Tulip red")

    @Rule(
        SystemControl(phase="search"),
        AS.node << SearchNode(status="active", state="load", last_item=MATCH.li, tot_i=MATCH.ti, i_ty=MATCH.inv, d_ty=MATCH.dty),
        TEST(lambda li, ti, inv, dty: can_load(li, 5, inv, dty, 1, ti) == 1),
        salience=100,
    )
    def l5(self, node, ti, inv):
        self.clone_node(node, "load", last_item=5, tot_i=ti + 1, i_ty=inv + 1, action="Loaded: Tulip yellow")

    @Rule(
        SystemControl(phase="search"),
        AS.node << SearchNode(status="active", state="load", last_item=MATCH.li, tot_i=MATCH.ti, i_op=MATCH.inv, d_op=MATCH.dop),
        TEST(lambda li, ti, inv, dop: can_load(li, 6, inv, dop, 2, ti) == 1),
        salience=100,
    )
    def l6(self, node, ti, inv):
        self.clone_node(node, "load", last_item=6, tot_i=ti + 1, i_op=inv + 1, action="Loaded: Orchid purple")

    @Rule(
        SystemControl(phase="search"),
        AS.node << SearchNode(status="active", state="load", last_item=MATCH.li, tot_i=MATCH.ti, i_opi=MATCH.inv, d_opi=MATCH.dopi),
        TEST(lambda li, ti, inv, dopi: can_load(li, 7, inv, dopi, 1, ti) == 1),
        salience=100,
    )
    def l7(self, node, ti, inv):
        self.clone_node(node, "load", last_item=7, tot_i=ti + 1, i_opi=inv + 1, action="Loaded: Orchid pink")

    @Rule(
        SystemControl(phase="search"),
        AS.node << SearchNode(status="active", state="load", last_item=MATCH.li, tot_i=MATCH.ti, i_rgg=MATCH.inv, d_rgg=MATCH.drgg),
        TEST(lambda li, ti, inv, drgg: can_load(li, 8, inv, drgg, 2, ti) == 1),
        salience=100,
    )
    def l8(self, node, ti, inv):
        self.clone_node(node, "load", last_item=8, tot_i=ti + 1, i_rgg=inv + 1, action="Loaded: RG gold")

    @Rule(
        SystemControl(phase="search"),
        AS.node << SearchNode(status="active", state="load", last_item=MATCH.li, tot_i=MATCH.ti, i_rglp=MATCH.inv, d_rglp=MATCH.drglp),
        TEST(lambda li, ti, inv, drglp: can_load(li, 9, inv, drglp, 2, ti) == 1),
        salience=100,
    )
    def l9(self, node, ti, inv):
        self.clone_node(node, "load", last_item=9, tot_i=ti + 1, i_rglp=inv + 1, action="Loaded: RG light pink")

    @Rule(
        SystemControl(phase="search"),
        AS.node << SearchNode(status="active", state="load", tot_i=MATCH.ti),
        TEST(lambda ti: ti > 0),
        salience=100,
    )
    def dispatch_deliv(self, node):
        self.clone_node(node, "deliver", add_g=1, action="Finished loading. Dispatched.")

    @Rule(SystemControl(phase="search"), AS.node << SearchNode(status="active", state="load"), salience=50)
    def close_load(self, node):
        self.modify(node, status="expanded")

    @Rule(
        SystemControl(phase="search"),
        AS.node << SearchNode(status="active", state="deliver", i_rr=MATCH.r1, i_rp=MATCH.r2, i_rw=MATCH.r3, d_rr=MATCH.d1, d_rp=MATCH.d2, d_rw=MATCH.d3),
        TEST(lambda r1, r2, r3, d1, d2, d3: ((r1 > 0) * (d1 < 2) + (r2 > 0) * (d2 < 1) + (r3 > 0) * (d3 < 1)) > 0),
        salience=100,
    )
    def route_p1(self, node):
        self.clone_node(node, "unload", add_g=3, rx=2, ry=4, action="Routed to P1")

    @Rule(
        SystemControl(phase="search"),
        AS.node << SearchNode(status="active", state="deliver", i_tr=MATCH.t1, i_ty=MATCH.t2, d_tr=MATCH.d1, d_ty=MATCH.d2),
        TEST(lambda t1, t2, d1, d2: ((t1 > 0) * (d1 < 3) + (t2 > 0) * (d2 < 1)) > 0),
        salience=100,
    )
    def route_p2(self, node):
        self.clone_node(node, "unload", add_g=2, rx=4, ry=3, action="Routed to P2")

    @Rule(
        SystemControl(phase="search"),
        AS.node << SearchNode(status="active", state="deliver", i_op=MATCH.o1, i_opi=MATCH.o2, d_op=MATCH.d1, d_opi=MATCH.d2),
        TEST(lambda o1, o2, d1, d2: ((o1 > 0) * (d1 < 2) + (o2 > 0) * (d2 < 1)) > 0),
        salience=100,
    )
    def route_p3(self, node):
        self.clone_node(node, "unload", add_g=4, rx=4, ry=5, action="Routed to P3")

    @Rule(
        SystemControl(phase="search"),
        AS.node << SearchNode(status="active", state="deliver", i_rgg=MATCH.g1, i_rglp=MATCH.g2, d_rgg=MATCH.d1, d_rglp=MATCH.d2),
        TEST(lambda g1, g2, d1, d2: ((g1 > 0) * (d1 < 2) + (g2 > 0) * (d2 < 2)) > 0),
        salience=100,
    )
    def route_p4(self, node):
        self.clone_node(node, "unload", add_g=2, rx=5, ry=2, action="Routed to P4")

    @Rule(SystemControl(phase="search"), AS.node << SearchNode(status="active", state="deliver"), salience=50)
    def close_deliv(self, node):
        self.modify(node, status="expanded")

    @Rule(
        SystemControl(phase="search"),
        AS.node << SearchNode(
            status="active",
            state="unload",
            rx=MATCH.rx,
            ry=MATCH.ry,
            tot_i=MATCH.ti,
            tot_d=MATCH.td,
            i_rr=MATCH.r1,
            i_rp=MATCH.r2,
            i_rw=MATCH.r3,
            i_tr=MATCH.t1,
            i_ty=MATCH.t2,
            i_op=MATCH.o1,
            i_opi=MATCH.o2,
            i_rgg=MATCH.g1,
            i_rglp=MATCH.g2,
            d_rr=MATCH.dr1,
            d_rp=MATCH.dr2,
            d_rw=MATCH.dr3,
            d_tr=MATCH.dt1,
            d_ty=MATCH.dt2,
            d_op=MATCH.do1,
            d_opi=MATCH.do2,
            d_rgg=MATCH.dg1,
            d_rglp=MATCH.dg2,
        ),
    )
    def process_unload(
        self,
        node,
        rx,
        ry,
        ti,
        td,
        r1,
        r2,
        r3,
        t1,
        t2,
        o1,
        o2,
        g1,
        g2,
        dr1,
        dr2,
        dr3,
        dt1,
        dt2,
        do1,
        do2,
        dg1,
        dg2,
    ):
        at_p1 = (rx == 2) * (ry == 4)
        at_p2 = (rx == 4) * (ry == 3)
        at_p3 = (rx == 4) * (ry == 5)
        at_p4 = (rx == 5) * (ry == 2)

        dp_r1 = min(r1, 2 - dr1) * at_p1
        dp_r2 = min(r2, 1 - dr2) * at_p1
        dp_r3 = min(r3, 1 - dr3) * at_p1
        dp_t1 = min(t1, 3 - dt1) * at_p2
        dp_t2 = min(t2, 1 - dt2) * at_p2
        dp_o1 = min(o1, 2 - do1) * at_p3
        dp_o2 = min(o2, 1 - do2) * at_p3
        dp_g1 = min(g1, 2 - dg1) * at_p4
        dp_g2 = min(g2, 2 - dg2) * at_p4

        tot_drop = dp_r1 + dp_r2 + dp_r3 + dp_t1 + dp_t2 + dp_o1 + dp_o2 + dp_g1 + dp_g2
        unld_any = tot_drop > 0

        new_ti = ti - tot_drop
        new_td = td + tot_drop

        next_s = (
            "done" * (new_td == TOTAL_DELIVERY_ITEMS)
            + "collect" * ((new_td < TOTAL_DELIVERY_ITEMS) * (new_ti == 0))
            + "deliver" * ((new_td < TOTAL_DELIVERY_ITEMS) * (new_ti > 0))
        )

        self.clone_node(
            node,
            next_s,
            add_g=1 * unld_any,
            action="Unloaded matching cargo",
            tot_i=new_ti,
            tot_d=new_td,
            last_item=1,
            i_rr=r1 - dp_r1,
            i_rp=r2 - dp_r2,
            i_rw=r3 - dp_r3,
            i_tr=t1 - dp_t1,
            i_ty=t2 - dp_t2,
            i_op=o1 - dp_o1,
            i_opi=o2 - dp_o2,
            i_rgg=g1 - dp_g1,
            i_rglp=g2 - dp_g2,
            d_rr=dr1 + dp_r1,
            d_rp=dr2 + dp_r2,
            d_rw=dr3 + dp_r3,
            d_tr=dt1 + dp_t1,
            d_ty=dt2 + dp_t2,
            d_op=do1 + dp_o1,
            d_opi=do2 + dp_o2,
            d_rgg=dg1 + dp_g1,
            d_rglp=dg2 + dp_g2,
        )

        self.modify(node, status="expanded")
