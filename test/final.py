import math
from experta import *

# ==========================================
# 0. THE INTERVIEW "KILL SWITCH"
# ==========================================
TOGGLE_BESTCASE = 1  

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
    def __init__(self):
        super().__init__()
        self.node_counter = 0

    def next_id(self):
        self.node_counter += 1
        return self.node_counter
        
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
        print(f"[GENERATE] Node #{id:3} | f={f:2} (bc={bc:2}) | {act}")

    @Rule(SystemControl(phase="search"), AS.node << SearchNode(status="active", id=MATCH.id, state=MATCH.state), salience=10000)
    def log_activated(self, id, state):
        print(f">>> [ACTIVE] Node #{id:3} picked for processing (State: {state})")

    @Rule(SystemControl(phase="search"), AS.node << SearchNode(status="dead", id=MATCH.id), salience=10000)
    def log_pruned(self, id):
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
    
    @Rule(AS.ctrl << SystemControl(phase="search"), SearchNode(status="active", state="done", id=MATCH.gid), salience=5000)
    def goal_found(self, ctrl, gid):
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
        print("\n--- TIMELINE MAP OF RUNTIME SUCCESS OPERATIONS ---")
        self.declare(PrintStep(id=1, step=0)) 

    @Rule(SystemControl(phase="print_fwd"), AS.ps << PrintStep(id=MATCH.curr, step=MATCH.step), Link(child=MATCH.curr, action=MATCH.act, rx=MATCH.rx, ry=MATCH.ry))
    def print_forward(self, ps, curr, step, act, rx, ry):
        print(f"Step {step:2}: [Node #{curr:3}] -> {act} | Pos: ({rx},{ry})")
        self.retract(ps)
        self.declare(FindNext(parent=curr, step=step+1))

    @Rule(SystemControl(phase="print_fwd"), AS.fn << FindNext(parent=MATCH.p, step=MATCH.s), Link(child=MATCH.c, parent=MATCH.p))
    def do_find_next(self, fn, p, s, c):
        self.retract(fn)
        self.declare(PrintStep(id=c, step=s))

    @Rule(SystemControl(phase="print_fwd"), AS.fn << FindNext(parent=MATCH.p, step=MATCH.s), NOT(Link(parent=MATCH.p)))
    def end_print(self, fn, p, s):
        self.retract(fn)
        self.halt()

    # ==========================================
    # 5. ENGINE STARTUP
    # ==========================================

    def startup(self):
        self.reset()
        self.declare(SystemControl(phase="search"))
        self.declare(SystemMeta(upper_bound=27, max_load=4)) 
        
        self.declare(SearchNode(
            id=self.next_id(), pid=0, state="collect", status="open", rx=3, ry=1, 
            g=0, h=calc_h(0,0,0,0,0,0,0,0,0,3,1), f=calc_bc(0, 0), bc=calc_bc(0, 0), 
            action="System Frame Initialization"
        ))
        self.run()

if __name__ == "__main__":
    engine = FlowerDeliveryEngine()
    engine.startup()