from experta import Fact, Field


class SystemControl(Fact):
    phase = Field(str, default="search")


class SystemMeta(Fact):
    upper_bound = Field(int, mandatory=True)
    max_load = Field(int, mandatory=True)
    warehouse_x = Field(int, default=3)
    warehouse_y = Field(int, default=2)
    start_x = Field(int, default=3)
    start_y = Field(int, default=1)


class Pavilion(Fact):
    pid = Field(int, mandatory=True)
    x = Field(int, mandatory=True)
    y = Field(int, mandatory=True)
    type = Field(str, mandatory=True)
    color = Field(str, mandatory=True)
    needed = Field(int, mandatory=True)
    delivered = Field(int, default=0)


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

    i_rr = Field(int, default=0)
    i_rp = Field(int, default=0)
    i_rw = Field(int, default=0)
    i_tr = Field(int, default=0)
    i_ty = Field(int, default=0)
    i_op = Field(int, default=0)
    i_opi = Field(int, default=0)
    i_rgg = Field(int, default=0)
    i_rglp = Field(int, default=0)

    d_rr = Field(int, default=0)
    d_rp = Field(int, default=0)
    d_rw = Field(int, default=0)
    d_tr = Field(int, default=0)
    d_ty = Field(int, default=0)
    d_op = Field(int, default=0)
    d_opi = Field(int, default=0)
    d_rgg = Field(int, default=0)
    d_rglp = Field(int, default=0)


class Moving(Fact):
    curr_x = Field(int, mandatory=True)
    curr_y = Field(int, mandatory=True)
    dest_x = Field(int, mandatory=True)
    dest_y = Field(int, mandatory=True)
    node_id = Field(int, default=0)
    step = Field(int, default=0)


class Link(Fact):
    child = Field(int)
    parent = Field(int)
    action = Field(str)
    rx = Field(int)
    ry = Field(int)


class TraceNode(Fact):
    id = Field(int)


class PrintStep(Fact):
    id = Field(int)
    step = Field(int)


class FindNext(Fact):
    parent = Field(int)
    step = Field(int)


class PathExpand(Fact):
    from_x = Field(int, mandatory=True)
    from_y = Field(int, mandatory=True)
    from_g = Field(int, mandatory=True)
    to_x = Field(int, mandatory=True)
    to_y = Field(int, mandatory=True)
    to_g = Field(int, mandatory=True)
    move_cost = Field(int, default=0)
    command = Field(str, default="")
    detail = Field(str, default="")
    state = Field(str, default="")
    step = Field(int, default=0)
    node_id = Field(int, default=0)
    f_n = Field(int, default=0)
    action = Field(str, default="")
