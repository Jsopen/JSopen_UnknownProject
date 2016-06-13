# JSOPEN Javascript Option Parser
A small option parser project, currently under further development
(I made this as my Javascript practice. Thus there may be many bugs in my code. Please help improve the code!)
# Example
node test.js -b 10 "this is a test"
```javascript
//test.js

var jo = require("./jsopen");
//jo(parser_message, is_verbose)
var parser = new jo("Message: My first Jsopen option parser", true);
//jo.add([a list of option names for the same option], destination, option_type, help_message)
parser.add(["-b", "--byte"], "dest_byte", jo.does.save_num, "print the first n bytes");
//jo.parse(): parse the input
parser.parse();

//jo.hasvar(var_name): examine if the var is used, meaning if corresponding option is called
if (parser.hasvar("byte")) {
	//retrieve the var from option destination
	var byte = parser.vars["byte"];
	//retrieve the inputs that are read but not stored in any destinations of any special options (will be presented in a list)
	var input = parser.vars.input;
}
```
