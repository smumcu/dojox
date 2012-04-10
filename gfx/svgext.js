define([
	"./_base",
	"./svg"], 
	function(g, svg){
	
	var svgext = g.svgext = {};

	svg.Shape.extend({
		addRenderingOption: function(/*String*/option, /*String*/value){
			// summary: Adds the specified SVG rendering option on this shape.
			// option: String
			//		The name of the rendering option to add to this shape, as specified by the
			//		SVG specification (http://www.w3.org/TR/SVG/painting.html#RenderingProperties)
			// value: String
			//		the option value.
			this.rawNode.setAttribute(option, value);
			return this; // self
		}
	});
	return svgext;
});
