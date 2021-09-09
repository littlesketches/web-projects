////////////////////////////////////////////////////////////////////	
//  Climate Wedges visualisation tool.       				      	//
//  
//  version: 0.1
//  Created by Point Advisory Pty Ltd with Litte Sketches 			//
//	
//  Provided (without support) under CCv3.0 Attribution license		//
//////////////////////////////////////////////////////////////////////	


//////////////////////////
/// Setup page onload ////
//////////////////////////
		
	window.onload = function(){
		d3.select('.info-box').style('transform', 'translate(555px,0px)')	// POsition info box out of view			
		d3.select('.info-box').style('display', 'inline')	// POsition info box out of view			
	}

	window.addEventListener('DOMContentLoaded', init)                       // Load project data from google sheet: using tabletop 
	function init(){  	
		d3.select('#control-pane').style('transform','translate(-100%, 0')

	  	// var public_spreadsheet_url = "https://docs.google.com/spreadsheets/d/1eVN3Gfjqj-qRpyx8BgNR52bsmYrriqNZr4Ty9bINrjk/pubhtml";
	  	// Tabletop.init({ 
	   //    	key: public_spreadsheet_url,
	   //    	callback: renderVis,
	   //    	simpleSheet: true 
	   //  });
		d3.csv("data/data.csv", function(error, data) {
		  renderVis(data)
		});

	};

		
//////////////////////////////////////////
/// Setup Pathways Visualisation Tool  ///
//////////////////////////////////////////

	// Declare global variables for storing data and series/key names
	var masterData = [],											// Store data from source is global variable for re-use/re-calculation in user selected views
		chartData =[],												// Data formatted to pass to stacked area chart generator
		chartDataZero =[],											// Always contins zero'd out layers to allow transition from flat layers 
		actionData = [],											// Data formatted/transposed to stackData format but for abatement layers only
		actionDataZero = [],										// As above but zero-ed out 
		refData = [],												// Reference case (no abatement) data with emissions wedges only
		refDataZero = [],											// As above but zero-ed out 
		adjRefData = [],											// Refefence case data adjusted for slider value
		sliderRefData = [],
		abatementData = [],	
		abatementDataArray = [],									// Action wedges converted to reference case groupings for subtraction
		emissionsData = [],
		scenarioActionAdjusted = [],
		scenarioAbatementAdjusted = [],
		scenarioEmissionsAdjusted = [];

	// Arrays for chart series names
	var actionNames = [],		
	 	years = [],													// Holds all pathway years e.g. 2018. 2020...2050 [programtially filled from input data]
	 	totalEmissions = [],										// Series for total emissions
	 	emissionsSourceKeys = [],									// e.g. Stationary energy, Transport, Waste
	 	emissionsSubSourceKeys = [],								// e.g. Elec/Gas ernergy, Transport, Waste
	 	emissionsComponentKeys = [],								// e.g. Resi electricity etc.
	 	allEmissionsKeys = [];										// Keys for all series charted as emissions wedges
	 	abatementSourceKeys = [],									// Series names for abatement actions at Source level
	 	abatementSubSourceKeys = [],								// Series names for abatement actions at SubSource level
	 	abatementComponentKeys = [],								// Series names for abatement actions at Component level
	 	chartSourceKeys = [],										// All series names (emission and abatement layers) for Source chart
	 	chartSubSourceKeys = [],									// All series names (emission and abatement layers) for SubSource chart
	 	chartComponentKeys = [],									// All series names (emission and abatement layers) for Component chart
	 	chartViewKeys = [], 
	 	scenarioSourceKeys = [],						
		views = ['source', 'subSource', 'component'],				// Used to control dropdown menu functions *** REPLACE LATER ith programmatically assigned names ***
		referenceCases = ['Optimistic', 'BAU', 'Pessimistic']		// Used to control dropdown menu functions *** REPLACE LATER ith programmatically assigned names ***

	// UI related variables
	var sliderObj = {},
		colourMap = {},												// Object with layer colours (HEX)		
	 	gradientFillMap = {},
	 	viewSelected, viewFocus, 									// Holds the selected emisisons focus 'view' and 'reference' case
	 	referenceSelected,	 										// keep track of the current chart view/detail focus
	 	emissionsScenario = 'BAU',									// keep track of the emissions forecast scenario
	 	tooltipDiv, 												// Tooltip (floating) div 
	 	format = d3.format(",d"),									// Function for number formatting
	 	prec = Math.max(0, d3.precisionFixed(0.05) - 2),
	 	formatPct = d3.format("." + prec + "%")									// Function for number formatting
		
	// UI related data arrays
	var scenarioDataZero =[],
		scenarioDataMax =[],		
		scenarioArray = [], 
		scenarioSetttings = [],
		scenarioWeights = [];
		actionWeights = {};			// Compoent level weights

	// Variables for vis: Define scales with ranges based on SVG dimensions for x, y and series colour scale
	var svg, g, margin, width, height, xScale, yScale;
	var stack = d3.stack();
	var area = d3.area()
		.curve(d3.curveCardinal)
	    .x(function(d) { return xScale(d.data.date); })
	    .y0(function(d) { return yScale(d[0]); })
	    .y1(function(d) { return yScale(d[1]); });
	var totalLine = d3.line()
		.curve(d3.curveCardinal)
	    .x(function(d) { return xScale(d['date']); })
	    .y(function(d) { return yScale(d['Total Emissions']); });
	var refLine = d3.line()
		.curve(d3.curveCardinal)
	    .x(function(d) { return xScale(d['date']); })
	    .y(function(d) { return yScale(d['Total Emissions']); });


/////////////////////////////////////  
// RENDER VIS: with starting view  //
/////////////////////////////////////

	// Note: renderVis is set as the callback after data is loaded: it  parses and transforms the data and renders the initial visualisaiton stat 
	function renderVis(data, tabletop){		
		// 1. Parse and create charting data
		updateScenario()							// Update scenario settings with slider values 		
		parseData(data);							// Parse and transpose data for stackData 
		masterData = data;       					// Pass data to global variable (for testing)
	    createColourClassMap(data);					// Call to create the colour map object for wedges
	    createData(data, 'BAU', scenarioSetttings)  // Initiate data for starting view
		
		// 2. Setup plot area with margins
		svg = d3.select("#vis")
				.attr("viewBox", "0 0 1000 500")
				.attr("width", 1000)
				.attr("height", 500)

		margin = {top: 20, right: 320, bottom: 50, left: 140},
	    width = svg.attr("width") - margin.left - margin.right,
	    height = svg.attr("height") - margin.top - margin.bottom;

	    // 3. Append SVG chart in group element
		g = svg.append("g").attr("id", "chart")
	    		.attr("transform", "translate(" + margin.left + "," + margin.top + ")");	

		// 4. Set scales and axis 
		xScale = d3.scaleLinear().range([0, width]).domain(d3.extent(years));
		yScale = d3.scaleLinear().range([height, 0]).domain([0, d3.max(totalEmissions)]);

		// 5. Render the charts for each view: the visiable chart is set by the changeViewLevel function 
		renderChart(chartData, chartSourceKeys, emissionsSourceKeys, "source")				// Render the area chart at Emissions source level
		renderChart(chartData, chartSubSourceKeys, emissionsSubSourceKeys, "subSource")			// Render the area chart at Emissions subSource level
		renderChart(chartData, chartComponentKeys, emissionsComponentKeys, "component")			// Render the area chart at Emissions component level
		renderAxis();													// Axis is rendered only once
		renderCommentary(chartData)
		renderTotalLine(refData, 'refPath', 'Reference case emissions');		// Refernce line is rendered only once, above the area charts
		renderTotalLine(chartData, 'totalPath', 'Emissions pathway');	// Emissions line is rendered only once, above the area charts
									
		// 6. Configure starting view and interactivity listeners
		setStartView('component');											// Starting view with chart line animation
		adjustChart()														// Funciton to control view of reference line and zero abatement labels	
		addListeners();														// Add event listeners for drop down menus 
		tooltipDiv = d3.select("body").append("div").attr("class", "tooltip").style("opacity", 0);     	// Define the div for the tooltip  
		// 7. Turn off chart pointer events
		setTimeout(function(){
			d3.selectAll('.wedge').style('pointer-events', 'none');
		}, 50)
	}; // end renderVis()


////////////////////////////////////////////
// CHART RENDERING FUNCTION: Binding data //
////////////////////////////////////////////

	// Map d3 stack and area functions to data and append area chart wedges
	function renderChart(data, viewKeys, emissionsKey, view){
		// viewKeys.splice(emissionsKey.length, 0, 'Abatement gap')		// Insert 'Abatement gap' into key
		// console.log(viewKeys)
		viewKeys.push('Abatement gap')
		stack.keys(viewKeys);											// Call d3 stack function to the keys 'view'
		
		// Create  group of each wedge for path/shape and label
		var wedge = g.selectAll(".wedge."+view)							
			.data(stack(data))
			.enter().append("g")
			  .attr("class", "wedge "+view);

		wedge.append("path")											// Append the wedge path/shape to g element
			.attr("class", function(d, i){								// Add class 'area' and individual name without spaces 
				var clName = d.key.replace(/\s+/g, '')						// d.key is the emissionsComponent name, with regex to remove spaces
				if(actionNames.indexOf(d.key) === -1){						
					  return "area emissions "+view+" "+clName} 			// if wedge is not an action
				else {return "area abatement "+view+" "+clName}; 		// if wedge is an abatement action
			})	
			.style("fill", function(d) {return gradientFillMap[d.key]; })	// Colour wedge
			.attr("d", area)
				.on('mouseover', function(d){
					d3.select(this).style('fill', function(d){return colourMap[d.key] ;})
					// d3.selectAll('.chartLabel.'+view).transition().duration(200).style('opacity', 0.1)
					d3.select(this.parentNode).select('g > text.chartLabel').transition().duration(200).style('opacity', 1).style('font-size', 15)
				})
				.on('mouseout', function(d){
					d3.select(this).style('fill', function(d){return gradientFillMap[d.key]; })
					// d3.selectAll('.chartLabel.'+view).transition().duration(200).style('opacity', 1)	
					d3.select(this.parentNode).select('g > text.chartLabel').transition().duration(200).style('font-size', 8)		  			  		
				})

		wedge.append("text")
			.attr('class', function(d, i){								// Add class 'chartLabel' and individual name without spaces 
			  	var clName = d.key.replace(/\s+/g, '')					// d.key is the emissionsComponent name, with regex to remove spaces
			  	if(actionNames.indexOf(d.key) === -1){					// if wedge is not an action
			  		return "chartLabel emissions "+view+" "+clName }
			  	else {return "chartLabel abatement "+view+" "+clName };	// if wedge is an abatement action
		  	})
			.attr("x", width + 15)
			.attr("y", function(d) { return yScale((d[d.length - 1][0] + d[d.length - 1][1]) / 2); })
			.attr("dy", ".35em")
			.text(function(d, i) { return viewKeys[i]; })			
			.style("fill", function(d, i) { return colourMap[d.key]; })  // Colour label to match layer		  	  
			.style("font-size", 8)  

		d3.selectAll('.chartLabel.abatement.'+view).style('opacity', 0);
	}; // end renderChat()

	// Function to render the axis
	function renderAxis(){
		var xAxisGroup = d3.select("#chart").append("g")
		  	.attr("class", "axis axis--x")
		  	.attr("transform", "translate(0," + height + ")")
		  	.call(d3.axisBottom(xScale).ticks(5, "Y"));

		var yAxisGroup = d3.select("#chart").append("g")
		  	.attr("class", "axis axis--y")
		  	.call(d3.axisLeft(yScale).ticks(10));	

		g.append("text").classed('axisLabel xLabel', true)
		  	.attr("transform", "translate("+width / 2+"," + (height + 40) + ")")		
			.text("Year")

	 	g.append("text").classed('axisLabel yLabel', true)
		  	.attr("transform", "translate("+ (-margin.left*0.55) +"," + height/2 + ")")
			.attr("dy", '-0.4rem')
		  	.style("text-anchor", "middle")
			.text("Emissions")

	 	g.append("text").classed('axisLabel yLabel labelUnits', true)
		  	.attr("transform", "translate("+ (-margin.left*0.55) +"," + height/2 + ")")
			.attr("dy", '0.4rem')
		  	.style("text-anchor", "middle")
			.text("kilotonnes CO2-e")
	}; // end renderAxis()

	// Render the Reference and Total Emissions lines
	function renderTotalLine(data, className, lineName){
		var pathway = d3.select("#chart").append("g").classed(className, true)

		pathway.append("path")
			.attr('class', className)
			.attr("d", totalLine(data));
		
		var node = pathway.selectAll(".node")
			.data(data).enter().append("g")	
			.attr('class', function(d){return className+' node year'+d.date} )	

		node.append("circle")		
			.attr('class', function(d){return className+' yearTotal year'+d.date} )			
			.attr('cx', function(d){return xScale(d.date) } )		
			.attr('cy', function(d){return yScale(d['Total Emissions']) } )		
	          .on("mouseover", function(d) { toolTipTotalOn(d, d3.event.pageX, d3.event.pageY) })          
	          .on("mouseout", toolTipTotalOff)

    	d3.select(".node.year2050.totalPath")
	    	.append("circle").classed('target', true)
			.attr('cx', xScale(years[years.length-1]) )		
			.attr('cy', yScale(data[years.length-1]['Total Emissions']) )
			.attr('r', 2.5)
			.style('pointer-events', 'none')
			.style('opacity', 0)
			.style('fill', '#fff')	

		// Attach path label: create path
		pathway.append("path")
			.attr('id', 'labelLine'+className)
			.attr("d", totalLine(data))
			.attr('transform', 'translate(0,-12)')			// Pull the label up from the line
			.style('fill', 'none')	

		// Attach path label: 
		pathway.append("text")
			.append("textPath")
			.attr("xlink:href", "#labelLine"+className)
				.attr('class', function(d){return className+' lineLabel'} )
				.attr("startOffset", "100%")	
				.style("text-anchor", "end") 
				.style("opacity", 0) 
				.text(lineName)
	};// end renderTotalLine()

// Render the emissions target 
	function renderTarget(data){
		d3.select('.totalPath.yearTotal')
	}

	// Render the commentary line
	function renderCommentary(data){
		var commentary = d3.select("#chart").append("g")
			.data(data)
			.classed('commentary', true)
		var futureEmissions = data[(years.length-1)]['Total Emissions'],
		 	currentEmissions = data[0]['Total Emissions'],
	 	 	futureEmissionsScaled = yScale(futureEmissions),
	 	 	totalFutureEmissions = data[years.length-1]['Total Emissions']
		 	abatement = (futureEmissions - totalFutureEmissions) / futureEmissions ;

		var lineData = [ 
				{"x": width +margin.left + 50,  "y": futureEmissionsScaled}, 
				{"x": width +margin.right -40, "y": futureEmissionsScaled}
				]
		var line = d3.line()
			.x(function(d){return d.x ;})
			.y(function(d){return d.y ;})

		commentary.append("path").classed('comPath commentary', true)
			.attr("d", line(lineData))
			.style('stroke', 'var(--fore-color)')
			.style('stroke-width', '2px')

		commentary.append("text").classed('comEmissions l1 commentary', true)
			.attr("x", width +margin.left + 50)
			.attr("y", futureEmissionsScaled)
			.attr("dy", 16)
			.style('font-size', 10)				
			.style('fill', 'var(--fore-color)')			
			.text('emissions of')

		commentary.append("text").classed('comEmissions l2 commentary', true)
			.attr("x", width +margin.left + 50)
			.attr("y", futureEmissionsScaled)
			.attr("dy", 28)
			.style('font-size', 10)				
			.style('fill', 'var(--fore-color)')			
			.text(function(d){ return format(futureEmissions) +' kt CO2-e'})

		commentary.append("text").classed('comAbatement l1 commentary', true)
			.attr("x", width + margin.left + 50)
			.attr("y", futureEmissionsScaled)
			.attr("dy", -20)
			.style('font-size', 10)			
			.style('fill', 'var(--fore-color)')			
			.text(function(d){ return formatPct(abatement)+ ' abatement' })

		commentary.append("text").classed('comAbatement l2 commentary', true)
			.attr("x", width + margin.left + 50)
			.attr("y", futureEmissionsScaled)
			.attr("dy", -8)
			.style('font-size', 10)			
			.style('fill', 'var(--fore-color)')			
			.text(function(d){ return 'by '+years[years.length-1] +' with'})

		d3.selectAll('.commentary').style('fill-opacity', 0.5)
	}; //end renderCommentary()

	// Control view of reference line and action labels
	function adjustChart(){
	 	viewSelected = d3.select('#viewSelector').text().trim();
		if(viewSelected === 'Sector level emissions'){viewSelected = 'source' } 				// This should be put in a function however need to deal with asynch issues in returned viewSelected
		else if (viewSelected === 'Sub-sector emissions'){	viewSelected = 'subSource' } 		// So map written inline temporarily
		else {viewSelected = 'component'} 

		// Show/hide the reference case line
		if(abatementData[years.length-1]['Total Emissions'] ===  0){
			d3.selectAll('.refPath').style('opacity',0)
		} else {
			d3.selectAll('.refPath').style('opacity',1)
		};
		// Show/hide abatement labels
		d3.selectAll('.chartLabel.abatement.'+viewSelected)
			.data(actionNames)
			.style('fill-opacity', function(d,i){
				if(actionData[years.length-1][d3.select(this).text()] === 0){
					return 0} else { return 1};
			})
		// Show/hide abatement labels
		d3.selectAll('.chartLabel.abatement.'+viewSelected)
			.data(actionNames)
			.style('fill-opacity', function(d,i){
				if(actionData[years.length-1][d3.select(this).text()] === 0){
					return 0} else { return 1};
			})			
		// Sjow/hide Abatmment Gap label;
		if(chartData[years.length-1]['Abatement gap'] === 0){
			d3.selectAll('.Abatementgap.'+viewSelected).style('opacity', 0)
		} else { d3.selectAll('.Abatementgap.'+viewSelected).style('opacity', 1)}

		// Update the  target % text
	}; //end adjustChart()



///////////////////////
// INTRO ANIMATIONS  //
///////////////////////

	// 1. Set up the view for the intro 
	function setStartView(view){
		viewFocus = views[view]; changeViewLevel(view, 0)			// Set starting view to component
		// Turn off wedges and commentary 
		d3.selectAll('path.area.'+view).style('opacity', 0);
		d3.selectAll('.chartLabel.'+view).style('fill-opacity', 0);	
		d3.selectAll('.commentary').style('opacity', 0);	
		// Setup the intro view	
		introSetup(chartData, view);	
	}; // end setStartView()

		// 1a. Helper to setup intro 
		function introSetup(data, view){
			// Hide the wedge chart elements not shown in intro
			d3.selectAll('.refPath,.totalPath').style('opacity', 0)
			d3.select('.axis.axis--x > path').style('opacity', 0 )
			d3.selectAll('.axis--x > .tick').style('opacity', 0 )
			d3.select('.axisLabel').style('fill-opacity', 0)
			d3.select('.axis--y > path').style('opacity', 0 )
	        d3.selectAll('.axis--y > .tick').style('opacity', 0 )

	        // Current Emissions: draw a dot as a starting view
	        var rectWidth = 200,
	         	currentYear = data[0]['date'],
	        	currentEmissions = data[0]['Total Emissions'],
				chart = d3.select('#chart').data(data)	

		    // Draw a dot as a starting view(rounded rect)
	        var rectEmissionsDot = chart.append('rect').classed('introElement currentEmissions', true)
		        rectEmissionsDot
		         	.attr('x', -rectWidth/2 + width/2)
		         	.attr('y',  function(d){return yScale(currentEmissions)})
		         	.attr('rx',  rectWidth)
		         	.attr('ry',  rectWidth)
	         		.attr('width', rectWidth)
	         		.attr('height', rectWidth)
		         	.style('cursor', 'pointer')
		         	.style('pointer-events', 'fill')
						.on('click', function(){animateLayerChart(chartData, 'component', 2000) ;})

		    // Add  emissions label: et to current emissions
	        var emissionsLabel = chart.append('g').classed('introElement currentEmissionsLabel', true)
		        emissionsLabel.append('text').classed('currentYearLabel', true)
		         	.attr('x', 	width/2)
		         	.attr('y',  function(d){return yScale(currentEmissions)})
		         	.attr('dy', 55)
		         	.attr('dx', 38)
		         	.style('font-size', '1rem')   
		         	.style('text-anchor', 'middle')      
		         	// .text('in '+currentYear)
		         	.style('pointer-events', 'none')
		         	.text('today')

		        emissionsLabel.append('text').classed('introElement currentEmissionsTotal', true)
		         	.attr('x',  width/2)
		         	.attr('y',  yScale(currentEmissions))
		        	.attr('dx', 0)	         	
		         	.attr('dy', 120)
		         	.style('text-anchor', 'middle')  
		         	.style('font-size', '4.5rem')   
		         	.style('pointer-events', 'none')
		         	.text(format(currentEmissions))

		        // Move "Emissions" axis label
		         d3.select('.axisLabel.yLabel').classed('introElement', true)
		         	.attr('x',  margin.left*0.55 + width/2)
		         	.attr('y',  -120)
		         	.attr('dx',  -25)
		         	.style('font-size', '1rem')
		         	.style('pointer-events', 'none')

		        // Move kilotonnes CO2-e axis lable
		         d3.select('.axisLabel.yLabel.labelUnits').classed('introElement', true)
		         	.attr('x',  margin.left*0.55 + width/2)
		         	.attr('y',  -40)
		         	.style('font-size', '1rem')
		         	.style('pointer-events', 'none')	

		   	// Fade in
		   		d3.selectAll('.introElement').style('opacity', 0)
		   			.transition().duration(500)
		   			.style('opacity', 1)

		

		}; // end introSetup()

	// 2. Transition to LayerChart
	function animateLayerChart(data, view, animationTime){
		var  currentEmissions = data[0]['Total Emissions'],
		     futureEmissions = Math.round(data[years.length-1]['Total Emissions'])

		 // Remove the commentary
		 d3.select('#intro-paragraph')
		 	.transition().duration(400)
		 	.style('opacity', 0)
		 	.transition().duration(0)
		 	.style('display', 'none')

		// Animate DOT to y axis chart
		d3.selectAll('.axis--y > .tick, .axis--y > path')
			.transition().duration(animationTime)		
	    	.style('opacity', 1 )

		// Move Emissions "dot" to Y axis
	    d3.select('rect.currentEmissions')
	    	.transition().duration(animationTime)	
	         	.attr('x', -8/2)
	         	.attr('y',  function(d){return yScale(currentEmissions) -5})
	         	.attr('width', 8)
	         	.attr('height', 8)
	         	.style('stroke-width', 2)
			.transition().duration(200)	         	
	         	.style('stroke', 'var(--fore-color)')
	         	.style('fill', 'var(--back-color)')
	        .transition().delay(animationTime)				// Remove the dot after animated dot replaces it
	         	.style('display', 'none')

		// Move labels
			d3.select('.currentYearLabel')						// Move Year label
			.transition().duration(animationTime/2)	
	  		.style('font-size', '0.75rem')
	  		.attr('x', 0)
	  		.attr('y', yScale(0) )
	  		.attr('dx', 0)
	  		.attr('dy', 25)

	     d3.select('.axisLabel.yLabel')        				// Move "Emissions" label to axis
			.transition().duration(animationTime/2)	         
	     	.attr('x',  0)
	     	.attr('y',  0)
	     	.attr('dx',  0)
	     	.style('font-size', '0.9rem')

	     d3.select('.axisLabel.yLabel.labelUnits')	        // Move "kilotonnes CO2-e" label to axis
			.transition().duration(animationTime/2)	         
	     	.attr('x',  0)
	     	.attr('y',  0)
	     	.style('font-size', '0.5rem')
		d3.select('.currentEmissionsTotal')					// Scale and move emissions total to label for emissions 'today'
			.transition().duration(animationTime)	
	  		.style('font-size', '1rem')
	        .attr('x', 0)
	        .attr('dx', 35)
	  		.attr('y', yScale(currentEmissions))
	     	.attr('dy', 5)
	     	.transition().delay(animationTime).duration(0)
	     		.text(format(currentEmissions))

		// Animate the transitons to layer chart by 
		setTimeout(function(){											// Change view after animation
			// Animation of the path and x axis

			animatePath('totalPath', animationTime, 1);		
			// Tween amount and move the emissions label from today to 2050 
	   		d3.select('.currentEmissionsTotal')
				.transition().duration(animationTime).ease(d3.easeLinear)
				.attr('x', xScale(years[years.length-1]) )	
				.attr('y', yScale(futureEmissions))	
				.tween("text", function() {
		            var that = d3.select(this),
		                i = d3.interpolateNumber(that.text().replace(/,/g, ""), futureEmissions);
		            return function(t) { that.text(format(i(t)))};
		         })

			d3.select('.axisLabel')
				.transition().duration(animationTime).ease(d3.easeLinear)			
				.style('fill-opacity', 1)

			// Fade in the wedges
			setTimeout(function(){	
				d3.selectAll('.wedge')
					.transition().duration(animationTime)
					.style('opacity', null)									
				d3.selectAll('path.area.'+view)
					.transition().duration(animationTime)
					.style('opacity', null)
				d3.selectAll('.emissions.chartLabel.'+view)
					.transition().duration(animationTime)
					.style('fill-opacity', 1)
				d3.selectAll('.Abatementgap')
					.style('opacity', 0)
				d3.select('.currentYearLabel')
					.transition().duration(1200)
					.style('opacity', 0)
					.transition()
	     			.style('display', 'none')

	     		// Fade out the future emissions number
		   		d3.select('.currentEmissionsTotal')
		   			.transition().duration(animationTime)
					.attr('y', yScale(futureEmissions) + 16)	
					.attr('x', margin.left+ width)
					.style('opacity', 0)
					.transition().duration(0)
						.attr('display', 'none')	

	     		// Fade in the commentary
		   		d3.selectAll('.commentary')
		   			.transition().delay(animationTime*0.25).duration(animationTime)
		   			.style('opacity', 1);	

		   		// Add back pointer events after all animations are finished
		   		setTimeout(function(){
		   			d3.selectAll('.wedge.'+view).style('pointer-events', 'auto')
		   			d3.select('#control-pane')
		   				.transition().duration(animationTime)
		   				.style('transform','translate(0, 0')	
					
		   		}, animationTime)
			}, animationTime* 2);
		}, animationTime *1.5);
	};
		// 2a. Helper to Animate emissions pathway
		function animatePath(selector, animationTime, axis){
			// Animate the path to draw
			var path = d3.select('path.'+selector);
			var totalPathLength = path.node().getTotalLength(); 
			path.attr("stroke-dasharray", totalPathLength )
				.attr("stroke-dasharray", totalPathLength + " " + totalPathLength)
	            .attr("stroke-dashoffset", totalPathLength)
	            .transition().duration(animationTime).ease(d3.easeLinear)   
	            .attr("stroke-dashoffset", 0)
	            .transition().duration(0)
	            .attr("stroke-dasharray", 'null')

	        // Animate nodes to grow as path goes through
	        var nodes = d3.selectAll('circle.'+selector)
	        nodes.style('r', 0)
	            .transition().duration(500)
	            .delay(function(d, i) { return (i) * (animationTime / years.length) + 10;})   
	            	.style('r', null)

	        // Animate the path label to appear at the end of the drawing aniamtion
	        var label  = d3.select('.lineLabel.'+selector)
	        label.style('opacity', 0)
	            .transition().duration(animationTime * 2 / years.length).delay(animationTime)   
					.style('opacity', 1)

			// Animate the x Axis
			if(axis !== undefined){
				var xAxisLine = d3.select('.axis--x > path')
				 	xAxisPathLength =  xAxisLine.node().getTotalLength()

				d3.selectAll('.'+selector).style('opacity', 1)
				d3.select('.lineLabel.'+'totalPath').style('opacity', 0)
				d3.select('.axis--x').style('opacity', 1 )
				d3.select('.axis.axis--x').style('opacity', 1 )

				xAxisLine.attr("stroke-dasharray", xAxisPathLength + " " + xAxisPathLength)
		            .attr("stroke-dashoffset", xAxisPathLength)
		            .style("opacity", 1)
		            .transition().duration(animationTime).ease(d3.easeLinear)
		            .attr("stroke-dashoffset", 0)			

				d3.selectAll('.axis--x > .tick').data(years)
		            .transition().duration(200).ease(d3.easeLinear)				
		            .delay(function(d, i) { return ( (i+1) * animationTime / years.length);})   
						.style('opacity', 1)
			};
		};


//////////////////////////
// CHART UPDATE:  VIS  // 
//////////////////////////

	// Update the chart with new view settings or updated data (e.g. from slider inputs)
	function updateChart(data, duration){
		// Get/set refSelected and view selected
	 	referenceSelected = d3.select('#refSelector').text().trim();
		if(referenceSelected === 'Business as Usual'){refScenario = 'BAU' } 					// This should be put in a function however need to deal with asynch issues in returned viewSelected
		else if (referenceSelected === 'Optimistic'){	refScenario = 'Optimistic' } 			// So map written inline temporarily
		else {refScenario = 'Pessimistic'} 

	 	viewSelected = d3.select('#viewSelector').text().trim();
		if(viewSelected === 'Sector level emissions'){viewSelected = 'source' } 				// This should be put in a function however need to deal with asynch issues in returned viewSelected
		else if (viewSelected === 'Sub-sector emissions'){	viewSelected = 'subSource' } 		// So map written inline temporarily
		else {viewSelected = 'component'} 

		sliderValue = gapSlider.value
		updateScenario();	// Update scenario settings to match sliders
		createData(data, refScenario, scenarioSetttings, sliderValue);			// Recreate the chart dataset

		// Update the chart shapes for all view layers
	 	chartViewKeys = [chartSourceKeys, chartSubSourceKeys, chartComponentKeys];
		for(i = 0; i < chartViewKeys.length; i++){reRenderChart(chartData, chartViewKeys[i], views[i])};

		// Function to update chart elements
		function reRenderChart(data, viewKeys, view, duration){
			if(typeof(duration) === 'undefined'){duration = 1500};								// Default transition to 1500ms. Can be user defined for instant transition (e.g. for a veiw change)		
			viewKeys.push('Abatement gap')
			stack.keys(viewKeys);	

			// Update wedges
			d3.selectAll(".area."+view).data(stack(data))
				.transition().duration(duration)
			    .attr("d", area);
			// Update labels
			d3.selectAll('.chartLabel.'+view).data(stack(data))
				.transition().duration(duration)
			  	.attr("y", function(d) { return yScale((d[d.length - 1][0] + d[d.length - 1][1]) / 2); })
			  	.text(function(d, i) { return viewKeys[i]; });
			 // Update total line
			d3.select('path.totalPath')
				.transition().duration(duration)
				.attr("d", totalLine(data))	
			// Update total nodes
			d3.selectAll(".totalPath.yearTotal").data(data)
				.on("mouseover", function(d) { toolTipTotalOn(d, d3.event.pageX, d3.event.pageY) })          
	          	.on("mouseout", toolTipTotalOff)
	          	.transition().duration(duration)	
					.attr('cx', function(d){return  xScale(d.date) } )		
					.attr('cy', function(d){return  yScale(d['Total Emissions']) } )		
			// Update total line label
			d3.select('#labelLinetotalPath')
				.transition().duration(duration)
				.attr("d", totalLine(data))	

			// Update target dot
	    	d3.select('.target')
	          	.transition().duration(duration)		    	
				.attr('cy', yScale(data[years.length-1]['Total Emissions']) )


			// Update Reference emissions line
			d3.select('path.refPath')
				.transition().duration(duration)
				.attr("d", refLine(refData))	
			// Update Reference line
			d3.selectAll(".refPath.yearTotal").data(refData)
				.on("mouseover", function(d) { toolTipTotalOn(d, d3.event.pageX, d3.event.pageY) })          
	          	.on("mouseout", toolTipTotalOff)
	          	.transition().duration(duration)	
					.attr('cx', function(d){return  xScale(d.date) } )		
					.attr('cy', function(d){return  yScale(d['Total Emissions']) } )	
			// Updaate Reference label
			d3.select('#labelLinerefPath')
				.transition().duration(duration)
				.attr("d", refLine(refData))	

			// Update commentary
			var futureEmissions = data[(years.length-1)]['Total Emissions'],
				currentEmissions = data[0]['Total Emissions'],
		 	 	futureEmissionsScaled = yScale(futureEmissions),
		 	 	abatement = (currentEmissions - futureEmissions) / currentEmissions ;
		
			var lineData = [ {"x": width +margin.left + 50,  "y": futureEmissionsScaled},  {"x": width +margin.right -40,  "y": futureEmissionsScaled}]
			var line = d3.line()
				.x(function(d){return d.x ;})
				.y(function(d){return d.y ;})

			d3.select('.comPath.commentary')
				.transition().duration(duration)
				.attr("d", line(lineData))

			d3.selectAll('.l1.comEmissions.commentary, .l2.comAbatement.commentary')
				.transition().duration(duration)	
				.attr("y", futureEmissionsScaled)	

			d3.select('.comEmissions.l2.commentary')
				.transition().duration(duration)		
				.attr("y", futureEmissionsScaled)				
				.text(function(d){ return format(futureEmissions) +' kt CO2-e'})

			d3.select('.comAbatement.l1.commentary')
				.transition().duration(duration)		
				.attr("y", futureEmissionsScaled)	
				.style('fill', 'var(--fore-color)')			
				.text(function(d){ return formatPct(abatement)+ ' abatement' })
		};// end reRenderChart()
		adjustChart()
	}; // end updateChart()

	// Initial data parsesing of raw data to usable numerical data, and call to create the starting 'BAU' chart 
	function parseData(data){
		years = Object.keys(data[0]).slice(0, 8);											// Slice the first 8 columns (alphabetically), which correspond to the pathway years				
		// Parse years to numbers 	
		for (i=0; i < years.length; i++) {years[i] = +years[i]}
		// Parse all CO2 volume entries from text to numbers 	
	    for (i = 0; i < data.length; i++){
	    	for (j = 0; j < years.length; j++){ 
	    		data[i][years[j]] = +data[i][years[j]];	    		
	    	};
	    };
	}; // end parseData()

	// Creates an object for referencing wedge colours
	function createColourClassMap(data){
		//PLACE HOLDER FOR FUNCTION TO MAKE colourMap object from ingested dataset
		colourMap = {							// Tempo object to manully set colours for every emissions and abatement wedge
			"Abatement gap": "#FFF",
	 		"Stationary Energy": "#3098B2",
			"Transport": "#FFAAEE",
			"Waste": "#ED3C30",
			"Electricity": "#2C81C9",
			"Gas": "#2CC9BE",
			"Residential electricity": "#768ED6",
			"Residential gas": "#7CAFE0",
			"Commercial electricity": "#79B7C9",
			"Commercial gas": "#7CE0DC",
			"Industrial": "#76D6B7",
			"Private vehicles": "#FFA39D",
			"Freight": "#E88FAA",
			"Public transport": "#D98FE8",
			"MSW": "#F08B25",
			"C&I / C&D": "#FA7226",
			"Efficiency - Residential": "rgb(120, 120, 120)",
			"Efficiency - Commercial": "rgb(120, 120, 120)",
			"Renewable Energy": "rgb(120, 120, 120)",
			"Electrification (+)": "rgb(120, 120, 120)",
			"Gas abatement": "rgb(120, 120, 120)",
			"Electricity abatement": "rgb(120, 120, 120)",
			"Increased Public Transport": "rgb(120, 120, 120)",
			"Increase Active Transport": "rgb(120, 120, 120)",
			"Electric vehicles": "rgb(120, 120, 120)",
			"Carbon Neutral Public Transport": "rgb(120, 120, 120)",
			"Transport abatement": "rgb(120, 120, 120)",
			"Increase diversion": "rgb(120, 120, 120)",
			"Increase LFG capture": "rgb(120, 120, 120)",
			"Waste abatement": "rgb(120, 120, 120)",
			"Energy abatement": "rgb(120, 120, 120)"
			};	 	

		// Make gradientFillMap object
		colourMapKeys = Object.keys(colourMap)
		var defs = d3.select('#vis>defs')

		for( i = 0; i <  colourMapKeys.length ; i++) {
			var gradient = defs.append('linearGradient').attr('id', 'gradient'+i)
				.attr('x1', '0%')
				.attr('x2', '100%')
				.attr('y1', '0%')
				.attr('y2', '0%')
					gradient.append('stop')
						.attr('offset', '30%')
						.attr('stop-color', colourMap[colourMapKeys[i]])
					gradient.append('stop')
						.attr('offset', '70%')
						.attr('stop-color', d3.rgb(colourMap[colourMapKeys[i]]).darker(1))
					gradient.append('stop')
						.attr('offset', '100%')
						.attr('stop-color', d3.rgb(colourMap[colourMapKeys[i]]).darker(2))

			gradientFillMap[colourMapKeys[i]] = "url(#gradient"+i+")";

		}
	}; // end creasteColourMap()

	// Creates/updates an object for slider settings 
	function updateScenario(){
		scenarioSetttings = [
	 		{"Energy efficiency": 
	 			{	"value": +sliderEE.value,
	 				"Efficiency - Residential": 1,
	 				"Efficiency - Commercial": 1,
	 				"Renewable Energy": 0,
					"Electrification (+)": 0,
					"Increased Public Transport": 0,
					"Increase Active Transport": 0,
					"Electric vehicles": 0,
					"Carbon Neutral Public Transport": 0,
					"Increase diversion": 0,
					"Increase LFG capture": 0
	 			}
	 		},
	 		{"Renewable energy": 
	 			{	"value": +sliderRE.value,
	 				"Efficiency - Residential": 0,
	 				"Efficiency - Commercial": 0,
	 				"Renewable Energy": 1,
					"Electrification (+)": 0,
					"Increased Public Transport": 0,
					"Increase Active Transport": 0,
					"Electric vehicles": 0,
					"Carbon Neutral Public Transport": 0,
					"Increase diversion": 0,
					"Increase LFG capture": 0
	 			}
	 		},
	 		{"Electrify gas assets": 
	 			{	"value": +sliderEG.value,
	 				"Efficiency - Residential": 0,
	 				"Efficiency - Commercial": 0,
	 				"Renewable Energy": 0,
					"Electrification (+)": 1,
					"Increased Public Transport": 0,
					"Increase Active Transport": 0,
					"Electric vehicles": 0,
					"Carbon Neutral Public Transport": 0,
					"Increase diversion": 0,
					"Increase LFG capture": 0
	 			}
	 		},
	 		{"Electric vehicle uptake": 
	 			{	"value": +sliderEV.value,
	 				"Efficiency - Residential": 0,
	 				"Efficiency - Commercial": 0,
	 				"Renewable Energy": 0,
					"Electrification (+)": 0,
					"Increased Public Transport": 0,
					"Increase Active Transport": 0,
					"Electric vehicles": 1,
					"Carbon Neutral Public Transport": 0,
					"Increase diversion": 0,
					"Increase LFG capture": 0
	 			}
	 		},
	 		{"Car share, active/passive uptake": 
	 			{	"value": +sliderAPT.value,
	 				"Efficiency - Residential": 0,
	 				"Efficiency - Commercial": 0,
	 				"Renewable Energy": 0,
					"Electrification (+)": 0,
					"Increased Public Transport": 1,
					"Increase Active Transport": 1,
					"Electric vehicles": 0,
					"Carbon Neutral Public Transport": 0,
					"Increase diversion": 0,
					"Increase LFG capture": 0
	 			}
	 		},
	 		{"Electrify public transport": 
	 			{	"value": +sliderEPT.value,
	 				"Efficiency - Residential": 0,
	 				"Efficiency - Commercial": 0,
	 				"Renewable Energy": 0,
					"Electrification (+)": 0,
					"Increased Public Transport": 0,
					"Increase Active Transport": 0,
					"Electric vehicles": 0,
					"Carbon Neutral Public Transport": 1,
					"Increase diversion": 0,
					"Increase LFG capture": 0
	 			}
	 		},
	 		{"Waste sorting": 
	 			{	"value": +sliderWS.value,
	 				"Efficiency - Residential": 0,
	 				"Efficiency - Commercial": 0,
	 				"Renewable Energy": 0,
					"Electrification (+)": 0,
					"Increased Public Transport": 0,
					"Increase Active Transport": 0,
					"Electric vehicles": 0,
					"Carbon Neutral Public Transport": 0,
					"Increase diversion": 1,
					"Increase LFG capture": 0
	 			}
	 		},
	 		{"Best available landfill gas capture": 
	 			{	"value": +sliderLFG.value,
	 				"Efficiency - Residential": 0,
	 				"Efficiency - Commercial": 0,
	 				"Renewable Energy": 0,
					"Electrification (+)": 0,
					"Increased Public Transport": 0,
					"Increase Active Transport": 0,
					"Electric vehicles": 0,
					"Carbon Neutral Public Transport": 0,
					"Increase diversion": 0,
					"Increase LFG capture": 1
	 			}
	 		}
	 	];	 

	 	// Clone structure for scenarioWeights
		scenarioWeights = _.cloneDeep(scenarioSetttings);
	}; // end createScearioSettings()

	// Create transposed datset for 'chartData' with components as columns and dates as rows
	function createData(data, refScenario, scenarioSetttings, sliderValue){
		// Clear the chartData object and supporting reference, action and abatement objects to reset values on update		
		chartData = [];							// Data for charting																		
		refData = [];							// Emissions pathway with no reduction		
		actionData = [];						// Abatement wedges				
		abatementData = [];						// Reference - action data (note: this the abatement from the reference structure)	
				 	 	
		var objRef = new Object(),				// Declare new objects to hold temp data for loading 
		 	objRefZero = new Object(),
		 	obj = new Object(),
		 	objZero = new Object();

		var abatementComponentData = [], abatementSourceData = [], abatementSubSourceData = [],
			sourceTypes 		= ['emissionsSource', 'emissionsSubSource', 'emissionsComponent'],			// Array of source headers
			abatementTypes 		= ['abatementSource', 'abatementSubSource', 'abatementComponent' ]			// Array of abatement headers

		// Call series of supporting functions to create chartData
		calcRef(data, refScenario);												// Create the reference case data structure
		calcAction(data, refScenario, scenarioSetttings, sliderValue);			// Create the action layers and abatement from reference layers
		calcChartData(data, refScenario, scenarioSetttings);					// Create the chartData set with adjustment for user inputted slider 
		updateChartData();														// Update the chartData set from which the updateChart() funciton redners the chart

		////// SUPPORTING FUNCTIONS FOR CREATING CHART DATA 

			// CALCULATE REFERENCE EMISSIONS LAYERS: Emissions with no abatement actions 
			function calcRef(data, refScenario){
				refData = []; refDataZero = [];						// Clear redData and refDataZero arrays

				// a. Filter Data to emissions wedges only
				var wedgeData = data.filter(function (el) {  return el.scenario === refScenario  && el.wedgeType === 'emissions'});

				// b. Setup key arrays (i.e. emission wedge names, used for creating key values) > 
				emissionsSourceKeys 	= d3.map(wedgeData, function(d){return d.emissionsSource}).keys(); 				// Get series names to set as keys for Source graph
				emissionsSubSourceKeys 	= d3.map(wedgeData, function(d){return d.emissionsSubSource}).keys(); 			// Get series names to set as keys for SubSource graph
				emissionsComponentKeys 	= d3.map(wedgeData, function(d){return d.emissionsComponent}).keys(); 			// Get series names to set as keys for Components graph

				// c. Create transposed dataset for emissions wedges: "refData" and "refDataZero" 
			    for (i = 0; i < years.length; i++){
		    	 	var objRef = 			{'date': years[i]},		objRefZero = {'date': years[i]},					// Declare temp object and add the date key and value for each object
				 		sourceTypeKeys = 	[emissionsSourceKeys, emissionsSubSourceKeys, emissionsComponentKeys]		// Array of source key arrays (i.e. series names)

					// Loop to add Emissions "source", "subsource" and "component" data
					for (j = 0; j < sourceTypes.length; j++) {
						var sourceType = sourceTypes[j],							// Emissions source type
						 	sourceKey = sourceTypeKeys[j];							// Array of series options for source type	

						// Loop to add key and value entries for each year (outermost loop) and sourcetype (outer loop)
				    	for(k = 0; k < sourceKey.length; k++){						
				    		var key  = sourceKey[k];																	// Name source key from sourcekey array
			  				var keyArray = wedgeData.filter(function(d){ return d[sourceType] === key}); 				// Filter data for one key
			    			var nestByYear = d3.nest()																	// Nest and rollup/sum data value for year/source
				    			.key(function(d) { return d[sourceType]; })
				    			.rollup(function(v) { return Math.round( d3.sum(v, function(d) { return d[years[i]]; }) , 1); })
			  					.entries(keyArray);
				    		objRef[key] = +nestByYear[0]['value'];						// Attach values to key in object programatically
				    		objRefZero[key] = 0;										// Attach zero value to key in zero'd object programattically
				    	}; // end k loop
					}; // end j loop

					// For each year[i] add the object of keys and values
					refData.push(objRef)												// Push objects to stackData variable for each year (array entry) 				
					refDataZero.push(objRefZero)										// Push objects with zero values to stackDataZero variable for each year (array entry) 				

					// Add total emissions to refData and refDataZero
					var emissions = 0;
					for(j = 0; j < sourceTypeKeys.length; j++){emissions = emissions + refData[i][sourceTypeKeys[0][j]] };
					refData[i]['Total Emissions'] = emissions;
					refData[i]['Abatement gap'] = 0;
					refDataZero[i]['Total Emissions'] = 0;
					refDataZero[i]['Abatement gap'] = 0;
					totalEmissions.push(emissions);
			    }; // end i loop

				// d. Set pathway data and emisssions data to zero (using deep clone to set same structure as the reference case)
				abatementData = _.cloneDeep(refDataZero);
				emissionsData = _.cloneDeep(refDataZero);
				sliderRefData = _.cloneDeep(refDataZero);
				adjRefData = _.cloneDeep(refData);
			}; // End CalcRef() ==> refData + structure for abatementData and emissionsData

			// CALCULATE MAX ABATEMENT ACTION WEDGES & ABATEMENT FROM EMISSIONS 'PARENT' EMISSIONS //	
			function calcAction(data, refScenario, scenarioSetttings, sliderValue){
				// a. Filter Data to abatement wedges only for each chart view type
					abatementComponentData 	= data.filter(function (el) {return el.scenario === 'Reference'  && el.wedgeType === 'abatement' && el.abatementLevel === 'emissionsComponent' });
					abatementSourceData 	= data.filter(function (el) {return el.scenario === 'Reference'  && el.wedgeType === 'abatement' && el.abatementLevel === 'emissionsSource'});
					abatementSubSourceData 	= data.filter(function (el) {return el.scenario === 'Reference'  && el.wedgeType === 'abatement' && el.abatementLevel === 'emissionsSubSource' });
					abatementDataArray 		= [abatementComponentData, abatementSubSourceData, abatementSourceData]								// Array setup for looping

				// b. Setup key arrays (i.e. abatement wedge names, used for creating key values)		
					abatementSourceKeys 	= d3.map(abatementSourceData, function(d){return d.abatementWedge}).keys(); 						// Get series names to set as keys for Source graph
					abatementSubSourceKeys 	= d3.map(abatementSubSourceData, function(d){return d.abatementWedge}).keys(); 						// Get series names to set as keys for SubSource graph
					abatementComponentKeys 	= d3.map(abatementComponentData, function(d){return d.abatementWedge}).keys(); 						// Get series names to set as keys for Components graph

				// c. Determine the scenario and action weights array of objects for scaling actions
					// c1. Create the scenario weights array of objects for scaling actions
						for(i = 0 ; i < years.length ; i++){									// For each year..
							for (j = 0; j < abatementComponentKeys.length; j++){				// For each compoment action..
								var key = abatementComponentKeys[j];
								for (k = 0; k < scenarioSetttings.length; k++){					// Loop through scenarios, match key and find valaue 	
									var scenario  	= Object.keys(scenarioSetttings[k])[0],
									 	scenarioObj = scenarioSetttings[k][scenario],
									 	sliderPct 	= scenarioObj.value / 100 ;
									// Create the scenario weights array of objects
									scenarioWeights[k][scenario][key] =  scenarioObj[key] * sliderPct
								}; // end k 
							}; // end j
						}; // end i => scenerioWeights created

					// c2. Create the action weights array of (simple) objects
						for(i = 0; i < abatementComponentKeys.length ; i++){
							var obj = {}, key = abatementComponentKeys[i], maxSlider = 0;

							// Find the highest slider value for each action (component level)
							for(j = 0; j < scenarioWeights.length ; j++){
								var scenario  = Object.keys(scenarioWeights[j])[0];
								if(maxSlider < scenarioWeights[j][scenario][key]){maxSlider = scenarioWeights[j][scenario][key]};
							}; // end j => maxSlider

							actionWeights[key] = maxSlider;
						};	// end i => actionWeights

				// d. Create transposed dataset for abatement wedges: "wedgeData" and "wedgeDataZero"; and emissions reduction object
					var nestByYear = 0,abatementValue = 0;

					// Loop for adding object to array for each year
				    for (i = 0; i < years.length; i++){
			    	 	obj = {'date': years[i]},  	 	 	
			    	 	objZero = {'date': years[i]},			
			    	 	objUnit = {'date': years[i]}			// Declare temp object and add the date key and value for each object
						
						var abatementTypeKeys 	= [abatementComponentKeys, abatementSubSourceKeys, abatementSourceKeys],						// Array of abatement key arrays (i.e. series names)
						 	parentEmissionsName,
						 	parentEmissions,
						 	subSourceEmissionsName,
						 	sourceEmissionsName;				

						// Loop to add abatement Emissions "source", "subsource" and "component" data
						for (j = 0; j < abatementTypes.length; j++) {
							var abatementType = abatementTypes[j],								// Abatement type name
							 	abatementKey = abatementTypeKeys[j];							// Array of series options for source type	

							// Loop to add key and value entries for each year (outermost loop) and sourcetype (outer loop)
					    	for(k = 0; k < abatementKey.length; k++){							// Add the emissionsSourceKeys	    		
					    		var key  = abatementKey[k],										// Name source key from sourekey array
				  				 	keyArray = abatementDataArray[j].filter(function(d){ return d.abatementWedge === key});

				  				if(actionNames.indexOf(key) === -1){actionNames.push(key)}		// Add Action name key if only it doesn't exist 

								// Find Source and SubSource parents
								var keySource = keyArray[0][sourceTypes[0]], 					// key of the Source 	
								 	keySubSource = keyArray[0][sourceTypes[1]] 					// key of the SubSource 

								// For all components: if relative emissions abatement for action, find parent component and multiply % reduction to get abatement. 
								// And add components to abatement data object (to subtract from the reference data)
								var absEmissions = 0;											// Reset the variable to hold the emissions to be added
								parentEmissionsName = keyArray[0]['emissionsComponent'];		// Find parent emissions
								parentEmissions = refData[i][parentEmissionsName];				// Find parent name

				  				if(keyArray[0]['abatementModel'] === 'relative'){ 				// For relative (%) reduction, multiply % by parent and set to absEmissions
				  					absEmissions = keyArray[0][years[i]] * parentEmissions;
				  				} else if(keyArray[0]['abatementModel'] === 'absolute'){
				  					absEmissions = keyArray[0][years[i]]						// For absolute reduction, set reduction to absEmission
				  				};

				  				// Scale absEmissions for slider settings
				  					var actionWeight;
				  					if(actionWeights[key] === undefined){actionWeight = 1} else {actionWeight = actionWeights[key]  }
				  					absEmissions = absEmissions * actionWeight
				  					
								// Components: add emissions abatement component-level to the abatement data object (i.e. sums up all action abatement assigned to the parent)
								abatementData[i][parentEmissionsName] += absEmissions;			// Adds absEmissions to parent abatement for all components		

								// Source and SubSource: Add emissions abatement to source and subsource wedges
								sourceEmissionsName = keyArray[0][sourceTypes[0]]; 				// Define source name
								subSourceEmissionsName = keyArray[0][sourceTypes[1]];			// Define subsource name
								if(typeof(abatementData[i][sourceEmissionsName] ) === 'undefined') {abatementData[i][sourceEmissionsName]  = 0}				// Creates key in abatementData object with emissions Source name
								if(typeof(abatementData[i][subSourceEmissionsName]) === 'undefined') {abatementData[i][subSourceEmissionsName]  = 0} 		// Creates key in abatementData object with emissions subSource name (non-duplicate)

								abatementData[i][sourceEmissionsName] += absEmissions;																		// Add to source
								if(sourceEmissionsName !== subSourceEmissionsName){abatementData[i][subSourceEmissionsName] += absEmissions;}				// Add to subSource if source isn't a duplicate (note: if a source name appears as a subsource name this is ok, but it can only appear once in the abatement to avoid double counting)

								// Add abatement value to Source and subSource level where appopriate)
								if(keyArray[0][abatementTypes[0]] !== 'na' || keyArray[0][abatementTypes[1]] !== 'na'){ 
							
					    		 	// Attach values to key (component-level) programattically
					    			obj[key] = absEmissions;													// Add emissiosn to obj[key] for components
					    			objZero[key] = 0;		objUnit[key] = 1;									// Add 0 and 1 to objZero and objUnit respectively

									// Add abatement value to SubSource wedge			
									var subSourceKey = keyArray[0][abatementTypes[1]];							// Define subSource name
									if(typeof(obj[subSourceKey]) === 'undefined') {obj[subSourceKey] = 0}		// Define key if one doesn't exist
									obj[subSourceKey] =  obj[subSourceKey] + absEmissions;						// Add emissions to key (cumulative)
									objZero[subSourceKey] = 0;		objUnit[subSourceKey] = 1;					// Set zero and unit objects

									// Add abatement value to Source wedge	(non duplicate)	
									var sourceKey = keyArray[0][abatementTypes[0]];								// Define Source name
									if(typeof(obj[sourceKey]) === 'undefined') {obj[sourceKey] = 0}				// Define key if one doesn't exist

									if(sourceKey !== subSourceKey){												// Add to source only if source isn't duplicated as a subsource
										obj[sourceKey] =  obj[sourceKey] + absEmissions;						// Add emissions to key (cumulative)
										objZero[sourceKey] = 0;		objUnit[sourceKey] = 1;										
									};
								};		
							}; // End k loop
						}; // end j loop

						actionData.push(obj);					// Push objects to abatementData variable for each year (array entry) 				
						actionDataZero.push(objZero);			// Push objects with zero values to abatementDataZero variable for each year (array entry) 								
						scenarioDataMax.push(objUnit);			// Push objects with unit value (1) to scenario for each year (array entry) 				
						scenarioDataZero.push(objZero);			// Push objects with zero values to abatementDataZero variable for each year (array entry) 				
				    }; // end i loop			

				// e. Calculate total abatement emissions			
				for(i = 0; i < years.length; i++){
					for(j = 0; j < emissionsComponentKeys.length; j++){
						abatementData[i]['Total Emissions'] += abatementData[i][emissionsComponentKeys[j]]
					};
					if(sliderValue === undefined){sliderValue = 0 };
					abatementData[i]['Abatement gap'] = ((sliderValue/100)  * (1 - (years.length - 1 - i) / (years.length - 1) )) * refData[i]['Total Emissions'] - abatementData[i]['Total Emissions'] ;
				};		
			}; // end calcAction() ==> abatementData + actionData

			// CALCULATE CHART DATA   
			function calcChartData(data, refScenario, scenarioSetttings){
				// a. Create keys for chart data
				chartSourceKeys 	= emissionsSourceKeys.concat(abatementSourceKeys);
				chartSubSourceKeys 	= emissionsSubSourceKeys.concat(abatementSubSourceKeys);
				chartComponentKeys 	= emissionsComponentKeys.concat(abatementComponentKeys);
				allEmissionsKeys 	= emissionsSourceKeys.concat(emissionsSubSourceKeys).concat(emissionsComponentKeys)		
				scenarioActionAdjusted = []

				// b. Call series of functions to create dataset and adjust for user inputted slider positions
				makeEmissionsData()								// Create emissions dataset without adjustment
				
				// Function to ake the emissions layer dataset: called multuple times to calculate before and after slider input(s)
				function makeEmissionsData(){
					for (i = 0; i < years.length; i++){
						for(j = 0; j < allEmissionsKeys.length; j++ ){
							emissionsData[i][allEmissionsKeys[j]] = refData[i][allEmissionsKeys[j]] - abatementData[i][allEmissionsKeys[j]] ;							
						}; // end j loop

						// Add total emissions
						emissionsData[i]['Total Emissions'] = refData[i]['Total Emissions'] - abatementData[i]['Total Emissions'] ;	

						// Determine the abatement gap (non-zero)
						if(abatementData[i]['Abatement gap'] < 0){ emissionsData[i]['Abatement gap'] = 0;
						} else{ emissionsData[i]['Abatement gap'] = abatementData[i]['Abatement gap'] }
						
						// Adjust the emission for each chart
							var reqReduction = emissionsData[i]['Abatement gap']
							// Adjust the emissions component data 
							for(k = 0; k < emissionsComponentKeys.length; k++){
								var component 	= emissionsComponentKeys[k],
								 	compPct 	= emissionsData[i][component] / emissionsData[i]['Total Emissions'],
								 	compRed		= compPct * reqReduction;
								emissionsData[i][component] = emissionsData[i][component] - compRed;
							}; // end k
							// Adjust the emissions source data 
							for(k = 0; k < emissionsSourceKeys.length; k++){
								var source 		= emissionsSourceKeys[k],
								 	sourcePct 	= emissionsData[i][source] / emissionsData[i]['Total Emissions'],
								 	sourceRed	= sourcePct * reqReduction;
								emissionsData[i][source] = emissionsData[i][source] - sourceRed;
							}; // end k
							// Adjust the subSource component data 

							for(k = 0; k < emissionsSubSourceKeys.length; k++){
								var subSource 		= emissionsSubSourceKeys[k],
								 	subSourcePct 	= emissionsData[i][subSource] / emissionsData[i]['Total Emissions'],
								 	subSourceRed	= subSourcePct * reqReduction;
								if(emissionsSourceKeys.indexOf(subSource) === -1){
									emissionsData[i][subSource] = emissionsData[i][subSource] - subSourceRed;
								}
							}; // end k

						// Adjust the total emissions
						emissionsData[i]['Total Emissions'] = emissionsData[i]['Total Emissions'] - emissionsData[i]['Abatement gap'] ;	
					};			
				}; // end makeEmissionsData() ==> emissionData 
			}; // end calcChartData()

			function updateChartData(scenario){
				// Merge the reference and action data to create the chartData set 
				for (i = 0; i < years.length; i++){
					chartData[i] = Object.assign(emissionsData[i], actionData[i])
				};	
			}; // update chartData()

	 }; // end CreateData()
	

	////////////////////////////
	// TOOLTIP FUNCTIONALITY  //
	////////////////////////////

	    function toolTipTotalOn(d, x, y) {
	      tooltipDiv  
	        .html("<g class= 'tipYear'>"+d.date+
	        	  "</g><br><g class = 'tipText'>Emissions: "+format(Math.round(d['Total Emissions']))+"kt"+
	        	  "</g><br><g class = 'tipText'>Change from "+years[0]+": "+  
	        	  	 Math.round((d['Total Emissions'] / chartData[0]['Total Emissions'] -1) *1000)/10 +"%"+
	        	  "</g>")  
	        .style("left", (x - 50) + "px")   
	        .style("top", (y -75) + "px")
	        .transition().duration(200)    
	          .style("opacity", .75);   
	    };

	    function toolTipTotalOff(){
	        tooltipDiv.transition().duration(500)    
	          .style("opacity", 0)
	    };	


	/////////////////////
	// TRIG HELPERS  ////
	////////////////////

		// Finds the angle of the total emissions line between dates 
		function findAngle(point1, point2){
			var x1 = xScale(point1['date']),
				y1 = yScale(point1['Total Emissions']),
				x2 = xScale(point2['date']),
				y2 = yScale(point2['Total Emissions']);

			var dx = x2 - x1,
				dy = y2 - y1,
				angle = Math.atan2(dy, dx) * 180 / Math.PI;
				
			return angle
		};

		function rotateHeader(data){
			d3.select('#main-header')
				.transition()
				.duration(2000)
				.style('transform', 'rotate('+findAngle(data[0], data[7])+'deg)')
		};


	////////////////////
	// USER INTERFACE //
    ////////////////////

    	// Function to change view focus: sets selected view and fires changeViewLevel without duration
		function changeViewFocus(viewSelected){
			if(viewSelected === 'Sector level emissions'){ viewSelected = 'source' } 
			else if (viewSelected === 'Sub-sector emissions'){viewSelected = 'subSource' } 
			else {	viewSelected = 'component' } 
	      	changeViewLevel(viewSelected) 
		}; // end changeViewFocus()

		// Function to change 'level of view detail' (e.g. from emissions 'source' to 'components')
		function changeViewLevel(view, duration){
			if(typeof(duration) === 'undefined'){duration = 1500};		
			d3.selectAll('.wedge, .chartLabel')
				.transition().duration(duration).style('opacity', 0)
				.style('pointer-events', 'none')			
			d3.selectAll('.wedge.'+view)
				.transition().duration(duration).style('opacity', 1)
				.style('pointer-events', 'auto')
			d3.selectAll('.chartLabel.'+view)
				.transition().duration(duration).style('opacity', 1)
			
			setTimeout(function(){adjustChart()}, duration)			
		};  // end chengeViewLevel()
		
		// Function to add event listerers: called after DOM is loaded
		function addListeners(){
			// View menu: Add listeners for all view options
			d3.selectAll('.viewMenu').on('click', function(){
		        d3.select('#viewSelector').html(d3.select(this).text().trim());
		        var viewSelected = d3.select('#viewSelector').html();
				changeViewFocus(viewSelected);
	      	});
			// Reference menu: Add listeners for all reference options
			d3.selectAll('.refMenu').on('click', function(){
		        d3.select('#refSelector').html(d3.select(this).text().trim());
		        var refScenario = d3.select('#refSelector').html();
				updateChart(masterData)
	      	});
			// Update the gap Slider 
	      	d3.select('#gapSlider')
				.on("input", function() {
					d3.select('#targetPct').text(gapSlider.value+'%')  
					d3.select('.target').transition().style('opacity', 1)
				});  

			// Add listener for info box
			d3.select('.info').on('click', toggleInfo)

		}; // end addListeners()

		// Function to update the gap slider 
		function updateGapSlider(){
			var futureEmissions = chartData[(years.length-1)]['Total Emissions'],
				currentEmissions = chartData[0]['Total Emissions'],
				slider = + gapSlider.value 
				target = Math.round(slider * currentEmissions/ futureEmissions );
 			d3.select('#targetPct').text(target+'%')
		} // end updateGapSlider()

		// Function to control info box
		var infoCounter = 0 	// Default for infobox hidden
		
		function toggleInfo(){
			if(infoCounter === 0){
				d3.select('.info-box').transition().duration(1000).style('transform', 'translate(0px,0px)');
				infoCounter = 1; 
			} else if(infoCounter === 1){
				d3.select('.info-box').transition().duration(1000).style('transform', 'translate(555px,0px)');
				infoCounter = 0; 
			}
		}




