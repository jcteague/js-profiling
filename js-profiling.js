var Profiler = (function () {
    var object_factory = new ObjectFactory();

    function profiler(config) {
        this.config = config || {};
        this.root_timer = new Timer();
        this.reports = [];
        this.steps = new Stack();
    };


    profiler.prototype = {
        constructor: profiler,

        Stack: Stack,
        Node: Node,
        ObjectFactory: ObjectFactory,

        register_step: register_step,
        has_not_being_started: has_not_being_started,
        start: start,
        stop: stop,
        getReports: getReports
    };

    function Stack() {
        var stack = {};

        var elements = [];
        stack.elements = elements;

        stack.push = function (element) {
            elements[elements.length] = element;
        };

        stack.pop = function () {
            return elements.pop();
        };

        stack.peek = function () {
            return elements[elements.length - 1];
        };

        return stack;
    }

    function Timer() {
        var self = {};
        var start_time;
        self.timespan = 0;

        self.start = function () {
            start_time = new Date();
            return self;
        };

        self.stop = function () {
            var end_time = new Date();
            self.timespan = end_time - start_time;
        };

        return self;
    };


    function ObjectFactory() {
        var self = {};

        self.create = function (namespace, parent) {
            parent = typeof parent == 'undefined' ? window : parent;

            var array = namespace.split('.');
            var len = array.length;
            var current;

            for (var i = 0; i < len; i++) {
                current = array[i];
                parent = parent[current];
            }

            return parent;
        };

        return self;
    };

    function Node(name) {
        return {
            name: name,
            timespan: 0,
            children_total_timespan: 0,
            children: [],
            add_child: function (node) {
                this.children = this.children || [];
                var children = this.children;
                children[children.length] = node;
            },
            set_timespan: function (timespan) {
                this.timespan = timespan;

                this.children = this.children || [];
                var children = this.children;
                this.children_total_timespan = (function () {
                    var len = children.length;

                    var sum = 0;
                    var child;
                    for (var i = 0; i < len; i++) {
                        child = children[i];
                        sum += child.timespan;
                    }

                    return sum;
                })();
            }
        };
    }

    function register_step(method_name, owner_full_name) {
        var self = this;
        var steps = this.steps;
        var owner = object_factory.create(owner_full_name);
        var method = owner[method_name];

        var method_with_instrumentation = function () {
                if (self.has_not_being_started()) {
                    method.apply(owner, arguments);
                    return;
                };

                var node_name = owner_full_name + '.' + method_name;
                var new_node = new Node(node_name);

                var current_node = self.steps.peek();
                current_node.add_child(new_node);
                steps.push(new_node);

                var timer = new Timer();
                timer.start();
                method.apply(owner, arguments);
                timer.stop();

                new_node.set_timespan(timer.timespan);
                steps.pop();
            };

        owner[method_name] = method_with_instrumentation;
    }

    function has_not_being_started() {
        return typeof this.steps.peek() == "undefined";
    }

    function start(name) {
        var root_node = new Node(name);
        this.steps.push(root_node);
        this.root_timer.start();
    }

    function stop() {
        if (this.has_not_being_started()) return;

        this.root_timer.stop();
        var root_node = this.steps.pop();
        root_node.set_timespan(this.root_timer.timespan);
        this.reports.push(root_node);


        if (this.config.onStop) {
            this.config.onStop(root_node);
        }
    }

    function getReports() {
        return this.reports;
    }

    return profiler;
})();

