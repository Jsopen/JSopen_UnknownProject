/*
JSOPEN Node Option Parser
Copyright: Kevin 'Kassimo' Qian
*/

'use strict'

const JO_MAN_DEFAULT = "No description";
const DELIMITER = "<[!@_@!]>";
const DELETER = "<[!@_@!]>";

function Jo_object() {
	//Keys for calling, e.g. -v, --bytes.
	this.keys = [];
	//Destination to store the info, e.g. some_var
	this.dest = "";
	//What kind of operations
	this.does = "";
	//Help information. Will be printed when a person try to call -h or --help.
	this.help = "";
}

////////////////////
//INTERNAL FUNCTIONS
////////////////////

//Check if is object
function isObject(value) {
	return (value !== null
		&& (typeof value === 'object'
			|| typeof value === 'function'));
}

//Write warning message, private use in the engine only
function Jo_write_warning(err) {
	if (arguments.length != 1) {
		throw new Error("JSOPEN: invalid use of Jo_write_warning\n")
	}
	process.stderr.write("Warning: JSOPEN: " + err);
}

//Write error message, private use in the engine only
function Jo_write_error(err) {
	if (arguments.length != 1) {
		throw new Error("JSOPEN: invalid use of Jo_write_error\n")
	}
	try {
		//Deliberately make this function undefined so as to get a stack for traceback
		ErrorMessageGenerator();
	} catch (e) {
		throw new Error("JSOPEN: " + err + e.stack);
	}
}

//Check if the key syntax is valid
function Jo_is_key_valid(key) {
	return String(key).match(/^[-]{1,2}[A-Za-z0-9]+$/) || false;
}

//Check if there are key collisions. WARNING: NO PROTECTION. System use only
function Jo_has_key_collision(jo, key) {
	if (jo instanceof Jo) {
		for (var opt of jo.opts) {
			for (var eg of opt.keys) {
				//Notice -'s are only read when parsing. They are not stored in the keys.
				if (String(eg) === key) {
					return true;
				}
			}
		}
		return false;
	}
	//true means has collision/error
	return true;
}
//Check if there are dest collisions. WARNING: NO PROTECTION. System use only
function Jo_has_dest_collision(jo, dest) {
	if (jo instanceof Jo) {
		for (var opt of jo.opts) {
			if (String(opt.dest) === dest) {
				return true;
			}
		}
		return false;
	}
	//true means has collision/error
	return true;
}

//Get a reference of the Jo_object by key
function Jo_get_obj_by_key(jo, key) {
	if (jo instanceof Jo) {
		for (var opt of jo.opts) {
			for (var eg of opt.keys) {
				//Notice -'s are only read when parsing. They are not stored in the keys.
				if (String(eg) === key) {
					return opt;
				}
			}
		}
		return null;
	}
	return null;
}

//Find next string index from stdin array
function Jo_find_next_string_index(arr, curr) {
	for (var i = curr+1; i < arr.length; i++) {
		//Avoid null exception (due to read strings changing to null)
		if (arr[i] === null) {
			continue;
		}
		
		if (arr[i][1] === false) {
			return i;
		}
	}
	//If did not find
	return -1;
}

//Detect if the next meaningful item in arr is string-typed entry
function Jo_strict_next_string_index(arr, curr) {
	for (var i = curr+1; i < arr.length; i++) {
		if (arr[i] === null) {
			continue;
		}
		if (arr[i][1] !== false) {
			return -1;
		} else {
			break;
		}
	}
	return i;
}


//Get the pipe from the stdin
function Jo_get_pipe() {
	process.stdin.resume();
	process.stdin.setEncoding('utf8');
	process.stdin.on('data', function(data) {
		return data;
	});
	return null;
}

////////////////////
//EXTERNAL FUNCTIONS
////////////////////

//Initialize Jsopen parser
function Jo(info, is_verbose) {
	//VERB: show warning messages. Verbose is true by default
	this.verb = true;
	//MAN: information of this file. Undefined when initialized
	this.man = JO_MAN_DEFAULT;
	//OPTS: a list of options. Empty by default 
	this.opts = [];
	
	var _len = arguments.length;
	if (_len >= 1) {
		var _temp = String(arguments[0]);
		this.man = _temp;
		if (_len >= 2) {
			this.verb = Boolean(arguments[1]);
		}
	} 
	if (_len > 2) {
		if (this.verb) {
			Jo_write_warning("more than one argument when initializing.\n Only the first argument is treated as description\n");
		}
	}
}

//Jo.does: types of action for Jo_object. Use Jo.does so that Jo_object could be hidden from user.
Jo.does = {
	save_none: "save_none",
	save_num: "save_num",
	save_str: "save_str",
	save_true: "save_true",
	save_false: "save_false"
};
//Make Jo.does not modifiable
Object.freeze(Jo.does);


//Add a new option
Jo.prototype.add = function (keys, dest, does, help) {
	var jo_obj = new Jo_object();
	//Handle keys
	if (0 in arguments) {
		if (Array.isArray(keys)) {
			if (keys.length <= 0) {
				Jo_write_error("when adding options, keys cannot be empty\n");
			}
			for (var key of keys) {
				if (Jo_is_key_valid(key) === false) {
					Jo_write_error("key name invalid\n");
				}
				if (Jo_has_key_collision(this, key)) {
					Jo_write_error("collision, key repeated\n");
				}
			}
			jo_obj.keys = keys;
		} else if (keys !== null && keys !== undefined && (! isObject(keys))) {
			//not null/undefined, not normal object
			if (Jo_is_key_valid(keys) === false) {
				Jo_write_error("key name invalid\n");
			}
			jo_obj.keys.push(keys);
		} else {
			Jo_write_error("cannot read keys for new option\n");
		}
	} else {
		Jo_write_error("no keys provided\n");
	}
	//Handle dest
	if (1 in arguments) {
		if (dest == false || isObject(dest) || Array.isArray(dest) || dest !== dest) {
			Jo_write_error("invalid dest name\n");
		} else {
			if (Jo_has_dest_collision(this, dest)) {
				Jo_write_error("collision, dest repeated\n");
			}
			jo_obj.dest = String(dest);
		}
	} else {
		Jo_write_error("no destination provided\n");
	}
	//Handle does type
	if (2 in arguments) {
		if (Jo.does[does]) {
			jo_obj.does = does;
		} else {
			Jo_write_error("cannot read save type\n");
		}
	} else {
		Jo_write_error("no save type specified\n");
	}
	//Handle help message
	if (3 in arguments) {
		try {
			jo_obj.help = String(help);
		} catch (e) {
			Jo_write_error("cannot read help message\n");
		}
	} else {
		if (this.verb) {
			Jo_write_warning("help message is empty\n")
			jo_obj.help = "no help message";
		}
	}
	//Discard extra params
	if (arguments.length > 4) {
		if (this.verb) {
			Jo_write_warning("add: extra parameters ignored\n");
		}
	}
	//push the examined Jo_object
	this.opts.push(jo_obj);
}

//Make parser quiet
Jo.prototype.quiet = function (be_quiet) {
	if (arguments.length == 0) {
		this.verb = false;
		return "JSOPEN: verb = false";
	} else {
		if (arguments.length > 1) {
			Jo_write_warning("more than one argument when asking quiet.\n Only the first argument is deemed\n");
			be_quiet = arguments[0];
		}
		this.verb = Boolean(be_quiet);
		return "JSOPEN: verb = " + String(this.verb);
	}
}

//Parse the stdin.
Jo.prototype.parse = function () {
	var stdin = process.argv;
	//Remove unnecessary stdin parts
	if (stdin[0].match(/.*node$/)) {
		stdin.splice(0, 2);
	} else {
		stdin.splice(0, 1);
	}
	
	//////TESTING//////
	//console.log(stdin);
	//////TESTING//////
	
	//This flag will be turned on when double dash is detected
	var double_dash_flag = false;
	var ddf_2b_true = false;
	
	//WARNING: this for loop could only secure addition to array, but NOT deletion!!!
	//deletion is undefined in JS!
	//true for option/special, false for string
	for (var item of stdin) {
		if (Array.isArray(item)) {
			//DO NOTHING, ignore it
		} else {
			item = String(item);
			if (item.match(/^[-]{1}[A-Za-z0-9]+$/)) {
				if (double_dash_flag === true) {
					double_dash_flag = false;
					var index = stdin.indexOf(item);
					stdin[index] = [item, false];
					continue;
				}
				if (Jo_has_key_collision(this, item)) {
					//refers to usage such as -regex, -name
					var index = stdin.indexOf(item);
					stdin[index] = [item, true];
				} else {
					//split to pieces, e.g. -123 -> -1, -2, -3; -nme -> -n, -m. -e
					var index = stdin.indexOf(item);
					stdin.splice(index, 1);
					for (var i = item.length-1; i > 0; i--) {
						if (! Jo_has_key_collision(this, "-" + item.charAt(i))) {
							Jo_write_error("disintegrated option \'-" + item.charAt(i) + "\' not found\n");
						}
						stdin.splice(index, 0, ["-" + item.charAt(i), true]);
					}
				}
			} else if (item.match(/^[-]{2}[A-Za-z0-9]+$/)) {
				//Long code
				var index = stdin.indexOf(item);
				//"=" means double dash
				stdin[index] = [item, true];
			} else if (item.match(/^-$/)) {
				//Pipe
				var index = stdin.indexOf(item);
				/*
				//PIPE becomes a special command
				stdin[index] = ["|", true]; 
				*/
				//Directly replace the data with the pipe data;
				var pipe_data = Jo_get_pipe();
				if (pipe_data === null) {
					Jo_write_error("pipe data not found");
				}
				stdin[index] = [String(pipe_data), false];
			} else if (item === "--") {
				//Cancel special meaning of leading - in the next item
				ddf_2b_true = true;
				var index = stdin.indexOf(item);
				stdin[index] = DELETER;
			} else if (item === '.') {
				//Solve directory related case
				var index = stdin.indexOf(item);
				stdin[index] = [process.cwd(), false];
			} else if (item === '..') {
				var index = stdin.indexOf(item);
				var parent_dir = String(process.cwd());
				parent_dir = parent_dir.substring(0, parent_dir.lastIndexOf("/"));
				stdin[index] = [parent_dir, false];
			} else {
				//Normal strings
				var index = stdin.indexOf(item);
				stdin[index] = [item, false];
			}
		}		
		if (ddf_2b_true) {
			double_dash_flag = true;
			ddf_2b_true = false;
		} else {
			double_dash_flag = false;
		}
	}
	
	var delete_index = stdin.indexOf(DELETER);
	while (delete_index >= 0) {
		stdin.splice(delete_index, 1);
		delete_index = stdin.indexOf(DELETER);
	}
	
	//////TESTING//////
	//console.log(stdin);
	//////TESTING//////
	
	var obj_ref;
	for (var i = 0; i < stdin.length; i++) {
		var item = stdin[i];
		
		//Avoid null exception (due to read strings changing to null)
		if (item === null) {
			continue;
		}
		
		if (item[1] === true) {
			obj_ref = Jo_get_obj_by_key(this, item[0]);
			
			if (obj_ref === undefined || obj_ref === null) {
				Jo_write_error("cannot find option '" + item[0] + "'\n");
			}
			
			if (obj_ref.does === Jo.does.save_num) {
				//var next_index = Jo_find_next_string_index(stdin, i);
				//if (next_index < 0) {
				//FIX THE LISTED INFO PROBLEM, e.g. "-b 1 -e 2" != "-b -e 1 2"
				var next_index = Jo_strict_next_string_index(stdin, i);
				if (next_index < 0) {
					Jo_write_error("missing arguments for for option " + item[0] + "\n");
				}
				//var num = Number(stdin[next_index][0]);
				var num = Number(stdin[next_index][0]);
				if (num !== num) {
					Jo_write_error("cannot parse number for save_num request\n");
				}
				
				//Avoid collision with the "input" key of Jo.vars
				if (obj_ref.dest === "input") {
					Jo_write_error("cannot use the reserved word 'input' for destination\n");
				}
				
				this.vars[obj_ref.dest] = num;
				//Change the object to null so that the new round of input detection won't meddle in
				stdin[next_index] = null;
			} else if (obj_ref.does === Jo.does.save_true) {
				
				//Avoid collision with the "input" key of Jo.vars
				if (obj_ref.dest === "input") {
					Jo_write_error("cannot use the reserved word 'input' for destination\n");
				}
				
				this.vars[obj_ref.dest] = true;
			} else if (obj_ref.does === Jo.does.save_false) {
				
				//Avoid collision with the "input" key of Jo.vars
				if (obj_ref.dest === "input") {
					Jo_write_error("cannot use the reserved word 'input' for destination\n");
				}
				
				this.vars[obj_ref.dest] = false;
			} else if (obj_ref.does === Jo.does.save_str) {
				//var next_index = Jo_find_next_string_index(stdin, i);
				//if (next_index < 0) {
				//FIX THE LISTED INFO PROBLEM, e.g. "-b 1 -e 2" != "-b -e 1 2"
				var next_index = Jo_strict_next_string_index(stdin, i);
				if (next_index < 0) {
					Jo_write_error("missing arguments for for option " + item[0] + "\n");
				}
				var str = String(stdin[next_index][0]);
				
				//Avoid collision with the "input" key of Jo.vars
				if (obj_ref.dest === "input") {
					Jo_write_error("cannot use the reserved word 'input' for destination\n");
				}
				
				this.vars[obj_ref.dest] = str;
				//Change the object to null so that the new round of input detection won't meddle in
				stdin[next_index] = null;
			}
		}
	}
	
	//Push the remaining inputs
	for (var i = 0; i < stdin.length; i++) {
		var item = stdin[i];
		if (item !== null && item[1] === false) {
			this.vars.input.push(item[0]);
		}
	}
}

//Add vars to Jo.vars so that they can later be accessed easily. e.g. var a = new Jo(), console.log(Jo.var["amy"]); WARNING: "input" is an reserved word!
Jo.prototype.vars = {
	input: []
};


Jo.prototype.getpipe = function () {
	process.stdin.resume();
	process.stdin.setEncoding('utf8');
	process.stdin.on('data', function(data) {
		return data;
	});
	return undefined;
}

//Check if a variable destination is used
Jo.prototype.hasvar = function (var_name) {
	if (0 in arguments) {
		var_name = String(var_name);
		if (this.vars[var_name] !== undefined) {
			return true;
		} else {
			return false;
		}
	} else {
		Jo_write_error("hasvar: name of var not provided!\n");
	}
	if (arguments.length > 1) {
		if (this.verb) {
			Jo_write_warning("hasvar: too many arguments, only the first argument is treated as var name\n");
		}
	}
}

Jo.prototype.help = function (entry1, entry2, entry3, etc) {
	var help_arr = [];
	if (arguments.length >= 1) {
		for (var item of arguments) {
			help_arr.push(String(item));
		}
	} else {
		for (var item of this.opts) {
			help_arr.push(item.keys[0]);
		}
	}
	//HELP bar
	process.stdout.write("--------HELP--------\n");
	
	//Examine each requested help entry and print
	for (var item of help_arr) {
		var entry = Jo_get_obj_by_key(this, item);
		if (entry === undefined || entry === null) {
			Jo_write_error("cannot get help info of unknown/nonexisting option\n");
		}
		var entry_key = String(entry.keys);
		
		process.stdout.write(entry_key + ": " + entry.help + "\n");
	}
}

module.exports = {
	parser: Jo,
	version: "0.0.1",
	author: "Kevin Kassimo Qian"
};
