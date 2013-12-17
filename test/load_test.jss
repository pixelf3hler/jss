<?jss def="j"
   green: "#7eff48",
   blue: "#14e15f",
   gtTest: function() {
      return window.innerWidth > 1024 ? "bold" : "normal"
   },
   roundCorner: function(radius) {
      return "border-radius: " + radius + ";"
   },
   shadow: function(clr) {
      var r = "box-shadow: 0px 5px 4px " + clr + ";\n",
      o = r + "-webkit-" + r + "-moz-" + r
      return o
   }
?>

.gt-test {
   font-weight: <?jss j.gtTest() ?>;
}

.test-class {
   color: <?jss j.green ?>;
}

#mixin_test {
   <?jss j.roundCorner("6px") ?>
}

.shadow-class {
   <?jss j.shadow("#000") ?>
}