define([
	"dojo/_base/lang",
	"dojo/_base/array"
], function(lang, array){
	var mvc = lang.getObject("dojox.mvc", true);
	/*=====
		mvc = dojox.mvc;
	=====*/

	/*=====
	dojox.mvc.BindTwo.converter = {
		// summary:
		//		Class/object containing the converter functions used when the data goes between data binding target (e.g. data model or controller) to data binding origin (e.g. widget).

		format: function(value, constraints){
			// summary:
			//		The converter function used when the data comes from data binding target (e.g. data model or controller) to data binding origin (e.g. widget).
			// value: Anything
			//		The data.
			// constraints: Object
			//		The options for data conversion, which is: mixin({}, dataBindingTarget.constraints, dataBindingOrigin.constraints).
		},

		parse: function(value, constraints){
			// summary:
			//		The converter function used when the data comes from data binding origin (e.g. widget) to data binding target (e.g. data model or controller).
			// value: Anything
			//		The data.
			// constraints: Object
			//		The options for data conversion, which is: mixin({}, dataBindingTarget.constraints, dataBindingOrigin.constraints).
		}
	};

	dojox.mvc.BindTwo.options = {
		// summary:
		//		Data binding options.

		// direction: Number
		//		The data binding direction, choose from: dojox.mvc.Bind.from, dojox.mvc.Bind.to or dojox.mvc.Bind.both.
		direction: dojox.mvc.both,

		// converter: dojox.mvc.Bind.converter
		//		Class/object containing the converter functions used when the data goes between data binding target (e.g. data model or controller) to data binding origin (e.g. widget).
		converter: null
	};

	dojox.mvc.BindTwo.handle = {
		// summary:
		//		A handle of data binding synchronization.

		unwatch: function(){
			// summary:
			//		Stops data binding synchronization.
		}
	};
	=====*/

	function getLogContent(/*dojo.Stateful*/ target, /*String*/ targetProp, /*dojo.Stateful*/ source, /*String*/ sourceProp){
		return [
			[source._setIdAttr || !source.declaredClass ? source : source.declaredClass, sourceProp].join(":"),
			[target._setIdAttr || !target.declaredClass ? target : target.declaredClass, targetProp].join(":")
		];
	}

	function copy(/*Function*/ convertFunc, /*dojo.Stateful*/ target, /*String*/ targetProp, /*dojo.Stateful*/ source, /*String*/ sourceProp, /*Anything*/ old, /*Anything*/ current, /*Object?*/ excludes){
		// summary:
		//		Watch for change in property in dojo.Stateful object.
		// description:
		//		Called when sourceProp property in source is changed. (This is mainly used as a callback function of dojo.Stateful.watch())
		//		When older value and newer value are different, copies the newer value to targetProp property in target.
		// convertFunc: Function
		//		The data converter function.
		// target: dojo.Stateful
		//		The dojo.Stateful of copy target.
		// targetProp: String
		//		The property of copy target, specified in data binding. May be wildcarded.
		// source: dojo.Stateful
		//		The dojo.Stateful of copy source.
		// sourceProp: String
		//		The property of copy source, being changed. For wildcard-based data binding, this is used as the property to be copied.
		// old: Anything
		//		The older property value.
		// current: Anything
		//		The newer property value.
		// excludes: Object?
		//		The list of properties that should be excluded from wildcarded data binding.

		// Bail if there is no change in value,
		// or property name is wildcarded and the property to be copied is not in target property list (and target property list is defined),
		// or property name is wildcarded and the property to be copied is in explicit "excludes" list
		if(old === current || typeof old == "number" && isNaN(old) && typeof current == "number" && isNaN(current)
		 || targetProp == "*" && array.indexOf(target.get("properties") || [sourceProp], sourceProp) < 0
		 || targetProp == "*" && sourceProp in (excludes || {})){ return; }

		var prop = targetProp == "*" ? sourceProp : targetProp, logContent = getLogContent(target, prop, source, sourceProp);

		try {
			current = convertFunc ? convertFunc(current) : current;
		}catch(e){
			if(dojox.debugDataBinding){
				console.log("Copy from" + logContent.join(" to ") + " was not done as an error is thrown in the converter.");
			}
			return;
		}

		if(dojox.debugDataBinding){
			console.log(logContent.reverse().join(" is being copied from: ") + " (Value: " + current + " from " + old + ")");
		}

		// Copy the new value to target
		lang.isFunction(target.set) ? target.set(prop, current) : (target[prop] = current);
	}

	var directions = {
		// Data binding goes from the target to the source
		from: 1,

		// Data binding goes from the source to the target
		to: 2,

		// Data binding goes in both directions (dojox.mvc.Bind.from | dojox.mvc.Bind.to)
		both: 3
	};

	var BindTwo = /*===== dojox.mvc.BindTwo = =====*/ function(/*dojo.Stateful*/ target, /*String*/ targetProp, /*dojo.Stateful*/ source, /*String*/ sourceProp, /*dojox.mvc.BindTwo.options*/ options){
		// summary:
		//		Synchronize two dojo.Stateful properties.
		// description:
		//		Synchronize two dojo.Stateful properties.
		// target: dojo.Stateful
		//		Target dojo.Stateful to be synchronized.
		// targetProp: String
		//		The property name in target to be synchronized.
		// source: dojo.Stateful
		//		Source dojo.Stateful to be synchronized.
		// sourceProp: String
		//		The property name in source to be synchronized.
		// options: dojox.mvc.BindTwo.options
		//		Data binding options.
		// returns:
		//		The handle of data binding synchronization.

		var converter = (options || {}).converter, converterInstance, formatFunc, parseFunc, debugDataBinding = dojox.debugDataBinding;
		if(converter){
			converterInstance = {target: target, source: source};
			formatFunc = converter.format && lang.hitch(converterInstance, converter.format);
			parseFunc = converter.parse && lang.hitch(converterInstance, converter.parse);
		}

		var _watchHandles = [], direction = (options || {}).direction || mvc.both, excludes = [], list, logContent = getLogContent(target, targetProp, source, sourceProp);

		if(sourceProp == "*"){
			if(targetProp != "*"){ throw new Error("Unmatched wildcard is specified between target and source."); }
			list = source.get("properties");
			if(!list){
				list = [];
				for(var s in source){ if(source.hasOwnProperty(s)){ list.push(s); } }
			}
			excludes = source.get("excludes");
		}else{
			list = [targetProp];
		}

		if(direction & mvc.from){
			// Start synchronization from target to source (e.g. from model to widget). For wildcard mode (targetProp == sourceProp == "*"), the 1st argument of watch() is omitted
			if(lang.isFunction(target.set) && lang.isFunction(target.watch)){
				_watchHandles.push(target.watch.apply(target, ((targetProp != "*") ? [targetProp] : []).concat([function(name, old, current){
					copy(formatFunc, source, sourceProp, target, name, old, current, excludes);
				}])));
			}else if(debugDataBinding){
				console.log(logContent.reverse().join(" is not a stateful property. Its change is not reflected to ") + ".");
			}

			// Initial copy from target to source (e.g. from model to widget)
			array.forEach(list, function(prop){
				// In "all properties synchronization" case, copy is not done for properties in "exclude" list
				if(sourceProp != "*" || !(prop in (excludes || {}))){
					var value = lang.isFunction(target.get) ? target.get(prop) : target[prop];
					// There are cases where model only provides "partial" set of properties for widgets.
					// Copying non-null properties from data model to widget, for example, will erase widget properties that are defined by default.
					if(value != null){
						copy(formatFunc, source, sourceProp == "*" ? prop : sourceProp, target, prop, null, value);
					}
				}
			});
		}

		if(direction & mvc.to){
			if(!(direction & mvc.from)){
				// Initial copy from target to source (e.g. from model to widget)
				array.forEach(list, function(prop){
					// In "all properties synchronization" case, copy is not done for properties in "exclude" list
					if(sourceProp != "*" || !(prop in (excludes || {}))){
						// Initial copy from source to target (e.g. from widget to model), only done for one-way binding from widget to model
						var value = lang.isFunction(source.get) ? source.get(sourceProp) : source[sourceProp];
						// Follow the practice of model->view initial copy, not copying null value
						if(value != null){
							copy(parseFunc, target, prop, source, sourceProp == "*" ? prop : sourceProp, null, value);
						}
					}
				});
			}

			// Start synchronization from source to target (e.g. from widget to model). For wildcard mode (targetProp == sourceProp == "*"), the 1st argument of watch() is omitted
			if(lang.isFunction(source.set) && lang.isFunction(source.watch)){
				_watchHandles.push(source.watch.apply(source, ((sourceProp != "*") ? [sourceProp] : []).concat([function(name, old, current){
					copy(parseFunc, target, targetProp, source, name, old, current, excludes);
				}])));
			}else if (debugDataBinding){
				console.log(logContent.join(" is not a stateful property. Its change is not reflected to ") + ".");
			}
		}

		if(debugDataBinding){
			console.log(logContent.join(" is bound to: "));
		}

		return {
			unwatch: function(){
				for(var h = null; h = _watchHandles.pop();){
					h.unwatch();
					if(debugDataBinding){
						console.log(logContent.join(" is unbound from: "));
					}
				}
			}
		}; // dojox.mvc.BindTwo.handle
	};

	lang.mixin(mvc, directions);

	return lang.setObject("dojox.mvc.BindTwo", lang.mixin(BindTwo, directions));
});
