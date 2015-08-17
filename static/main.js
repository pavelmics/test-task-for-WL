// define Angular app
(function() {
    angular.module('app', ['controllers']);
    angular.module('controllers', ['models']);
    angular.module('models', []);
    angular.module('utils', []);
})();

// models
(function() {
    var models = angular.module('models');

    /**
     * Default abstract function
     * @private
     */
    var _abstract = function() {
        throw "Child classes must implement this function!";
    };

    // Point
    models.factory('Point', [function() {
        var Point = function(x, y) {
            this.x = Math.round(x);
            this.y = Math.round(y);
        };

        return Point;
    }]);

    // GameField
    models.factory('GameField', ['Point', 'Figure', function(Point, Figure) {
        var GameField = function($domElement) {
            if ($domElement.length !== 1) {
                throw 'Every GameField can work with only one dom element!'
            }
            this.$target = $domElement;
            this.height = $domElement.innerHeight();
            this.width = $domElement.innerWidth();
            this.zIndex = $domElement.css("z-index");
            this.offset = $domElement.offset();
            this.clickCallback = null;

            this.init();
        };
        GameField.prototype = {
            init: function() {
                var self = this;
                self.$target.on('click', function(e) { self.gameFieldClick(e); });
            },

            /**
             * Call when mouse clicks on field
             */
            gameFieldClick: function(e) {
                var clickPoint = this.getPointFromEvent(e);
                if (typeof this.clickCallback === 'function') {
                    this.clickCallback(clickPoint);
                }
            },

            /**
             * Returns a point of event
             * @param e
             * @return {Point}
             */
            getPointFromEvent: function(e) {
                return new Point(e.pageX - this.offset.left
                    , e.pageY - this.offset.top);
            },

            /**
             * Renders figure on the field
             * @param {Figure} figure
             */
            bindFigure: function(figure) {
                var $div;
                if (!figure instanceof Figure) {
                    throw "Param must be instance of Figure"
                }

                this.zIndex += 1;
                $div = $(document.createElement('div'));
                $div.css({"z-index": this.zIndex});

                figure.setDomElement($div);
                this.$target.append($div);
            }
        };

        return GameField;
    }]);

    // Figure model
    models.factory('Figure', ['Utils', 'Point', function(Utils, Point) {
        var Figure = function(data) {
            if (this.constructor === Figure) {
                throw new Error("This class is abstract!");
            }
            if (typeof data !== 'object') {
                return;
            }
            if (!data.center instanceof Point) {
                throw new Error("The center param must be instance of Point");
            }
            this.center = data.center;
            this.height = data.height; // common name for square height and round radius
            this.color = data.color;

            this.minHeight = this.maxHeight = 0;
        };
        Figure.prototype = {

            /**
             * Return html class for object
             */
            getClass: _abstract,

            /**
             * Generates random instance of Figure
             */
            setRandomParams: function(data) {
                angular.extend(this, _.extend({
                    center: (new Point(Utils.rand(0, 1000), Utils.rand(0, 1000)))
                    , color: Utils.getRandomColor()
                    , height: Utils.rand(this.minHeight, this.maxHeight)
                }, data));
            },

            /**
             * Return css fields for figure
             * @returns {object}
             */
            getCss: function() {
                var h = this.height
                    , halfH = Math.round(h / 2);

                return {
                    "background-color": this.color
                    , width: h
                    , height: h
                    , top: this.center.y - halfH
                    , left: this.center.x - halfH
                };
            },

            /**
             * Sets target DOM element
             * @param $domElem
             */
            setDomElement: function($domElem) {
                var self = this;
                if (!$domElem instanceof $) {
                    throw "$domElement must be jquery object";
                }

                self.$target = $domElem;
                self.$target.on('click', function(e) {
                    e.stopPropagation();
                    self.$target.remove();
                })
            },

            /**
             * Renders figure at the field
             */
            render: function() {
                if (!this.$target instanceof $) {
                    throw 'Figure must be bound to GameField';
                }
                this.$target.addClass(this.getClass());
                this.$target.css(_.extend({
                    position: 'absolute'
                }, this.getCss()));
            }
        };

        return Figure;
    }]);

    // Square
    models.factory('Square', ['Figure', function(Figure) {
        var Square = function(data) {
            Figure.call(this, data);
            this.minHeight = 20;
            this.maxHeight = 150;
        };
        Square.prototype = Object.create(Figure.prototype);

        /**
         * @inheritdoc
         */
        Square.prototype.getClass = function() {
            return 'figure-square';
        };

        return Square;
    }]);

    // Round
    models.factory('Round', ['Figure', function(Figure) {
        var Round = function(data) {
            Figure.call(this, data);
            this.minHeight = 30;
            this.maxHeight = 200;
        };
        Round.prototype = Object.create(Figure.prototype);

        /**
         * @inheritdoc
         */
        Round.prototype.getClass = function() {
            return 'figure-round';
        };

        /**
         * @inheritdoc
         */
        Round.prototype.getCss = function() {
            var baseCss = Figure.prototype.getCss.call(this)
                , h = this.height
                , halfH = Math.round(h / 2);

            return _.extend(baseCss, {
               'border-radius': halfH
            });
        };

        return Round;
    }]);
})();

// RoundSquareGameCtrl
(function() {

    var _roundSquareGameFactory = function($scope, GameField, Point, Figure, Square, Round, Utils) {
        var field;
        $scope.figures = [];

        $scope.initGameField = function() {
            field = new GameField($('.js-game-field'));

            field.clickCallback = function(clickPoint) {
                var figureClass
                    , figure;
                figureClass = (Utils.rand(0, 1) === 0) ? Square : Round;

                figure = new figureClass();
                figure.setRandomParams({center: clickPoint});
                field.bindFigure(figure);
                figure.render();
            }
        }
    };

    angular.module('controllers')
        .controller('RoundSquareGameCtrl', ['$scope', 'GameField', 'Point'
            , 'Figure', 'Square', 'Round', 'Utils', _roundSquareGameFactory]);
})();

// utils
(function() {
    angular.module('app').factory('Utils', [function() {
        return {

            /**
             * Returns int value ranged form min to max
             * @param min
             * @param max
             * @returns {int}
             */
            rand: function(min, max) {
                return Math.round((Math.random() * (max - min) + min));
            },

            /**
             * Generates random color
             * @link http://stackoverflow.com/questions/1484506/random-color-generator-in-javascript
             * @returns {string}
             */
            getRandomColor: function() {
                return '#'+(Math.random()*0xFFFFFF<<0).toString(16);
            }
        };
    }]);
})();