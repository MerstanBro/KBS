from experta import AS, MATCH, Rule, TEST

from facts import Moving, SearchNode, SystemControl, SystemMeta


class MovementRules:
    @Rule(
        SystemControl(phase="search"),
        SystemMeta(warehouse_x=MATCH.wx, warehouse_y=MATCH.wy),
        AS.node << SearchNode(status="active", state="collect", rx=MATCH.rx, ry=MATCH.ry),
    )
    def rule_collect(self, node, rx, ry, wx, wy):
        dist = abs(rx - wx) + abs(ry - wy)
        self.clone_node(node, "load", add_g=dist, rx=wx, ry=wy, action="Traveled to warehouse")
        self.modify(node, status="expanded")

    @Rule(
        SystemControl(phase="expand_path"),
        AS.move << Moving(curr_x=MATCH.cx, curr_y=MATCH.cy, dest_x=MATCH.dx),
        TEST(lambda cx, dx: cx < dx),
        salience=100,
    )
    def step_right(self, move, cx, cy):
        new_x = cx + 1
        self._path_step_log.append(("robot move right", new_x, cy))
        self.retract(move)
        self.declare(
            Moving(
                curr_x=new_x,
                curr_y=cy,
                dest_x=move["dest_x"],
                dest_y=move["dest_y"],
                node_id=move["node_id"],
                step=move["step"],
            )
        )

    @Rule(
        SystemControl(phase="expand_path"),
        AS.move << Moving(curr_x=MATCH.cx, curr_y=MATCH.cy, dest_x=MATCH.dx),
        TEST(lambda cx, dx: cx > dx),
        salience=100,
    )
    def step_left(self, move, cx, cy):
        new_x = cx - 1
        self._path_step_log.append(("robot move left", new_x, cy))
        self.retract(move)
        self.declare(
            Moving(
                curr_x=new_x,
                curr_y=cy,
                dest_x=move["dest_x"],
                dest_y=move["dest_y"],
                node_id=move["node_id"],
                step=move["step"],
            )
        )

    @Rule(
        SystemControl(phase="expand_path"),
        AS.move << Moving(curr_x=MATCH.cx, curr_y=MATCH.cy, dest_x=MATCH.dx, dest_y=MATCH.dy),
        TEST(lambda cx, dx, cy, dy: cx == dx and cy < dy),
        salience=100,
    )
    def step_down(self, move, cx, cy):
        new_y = cy + 1
        self._path_step_log.append(("robot move down", cx, new_y))
        self.retract(move)
        self.declare(
            Moving(
                curr_x=cx,
                curr_y=new_y,
                dest_x=move["dest_x"],
                dest_y=move["dest_y"],
                node_id=move["node_id"],
                step=move["step"],
            )
        )

    @Rule(
        SystemControl(phase="expand_path"),
        AS.move << Moving(curr_x=MATCH.cx, curr_y=MATCH.cy, dest_x=MATCH.dx, dest_y=MATCH.dy),
        TEST(lambda cx, dx, cy, dy: cx == dx and cy > dy),
        salience=100,
    )
    def step_up(self, move, cx, cy):
        new_y = cy - 1
        self._path_step_log.append(("robot move up", cx, new_y))
        self.retract(move)
        self.declare(
            Moving(
                curr_x=cx,
                curr_y=new_y,
                dest_x=move["dest_x"],
                dest_y=move["dest_y"],
                node_id=move["node_id"],
                step=move["step"],
            )
        )
