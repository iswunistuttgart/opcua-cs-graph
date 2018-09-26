var margin = {top: 20, right: 20, bottom: 30, left: 20},
    outerWidth = 0, outerHeight = 0, width = 0, height = 0;
var opcua_data = null;

/*
 * value accessor - returns the value to encode for a given data object.
 * scale - maps value to a visual display encoding, such as a pixel position.
 * map function - maps from data value to display value
 * axis - sets up axis
 */

function object2html(d) {
    var retVal = "";

    function isUrl(str) {
        regexp = /^(?:(?:https?|ftp):\/\/)?(?:(?!(?:10|127)(?:\.\d{1,3}){3})(?!(?:169\.254|192\.168)(?:\.\d{1,3}){2})(?!172\.(?:1[6-9]|2\d|3[0-1])(?:\.\d{1,3}){2})(?:[1-9]\d?|1\d\d|2[01]\d|22[0-3])(?:\.(?:1?\d{1,2}|2[0-4]\d|25[0-5])){2}(?:\.(?:[1-9]\d?|1\d\d|2[0-4]\d|25[0-4]))|(?:(?:[a-z\u00a1-\uffff0-9]-*)*[a-z\u00a1-\uffff0-9]+)(?:\.(?:[a-z\u00a1-\uffff0-9]-*)*[a-z\u00a1-\uffff0-9]+)*(?:\.(?:[a-z\u00a1-\uffff]{2,})))(?::\d{2,5})?(?:\/\S*)?$/;
        if (regexp.test(str)) {
            return true;
        }
        else {
            return false;
        }
    }

    for (var key in d) {

        retVal += "<dt>" + key + "</dt><dd>";
        if (isUrl(d[key])) {
            retVal += "<a href=" + d[key] + ">" + d[key] + "</a>";
        } else {
            retVal += d[key];
        }
        retVal += "</dd>";
    }
    return ("<dl>" + retVal + "</dl>");
}

function mapDisplayData(d) {
    return {
        "Name": d.parent.name,
        "Short Name": d.parent.shortName,
        "Version": d.version,
        "Date": d.details.date,
        "Status": d.details.status,
        "Link": d.details.link,
        "Type": getStandardType(d.parent.type),
        "Standard Type": d.parent.standard_type
    };
}

var date_format = d3.time.format("%b %y");

// setup x
var xValue = function (d) {
        return new Date(d.details.date).getTime();
    }, // data -> value
    xScale = d3.time.scale(), // value -> display
    xMap = function (d) {
        return xScale(xValue(d));
    }, // data -> display
    xAxis = d3.svg.axis().scale(xScale).orient("bottom");

var rowCount = {1:0, 2:0, 3:0, 4:0};
var totalRowCount = 4;
var rowOffsets = {1:0, 2:0, 3:0, 4:0};
var rowVisible = {1:true, 2:true, 3:true, 4:false};
var typeNames = {1: "application-related", 2: "domain-specific", 3: "general", 4: "opc ua standard"};
function getStandardType(d) {
    return Number.isInteger(d) ? typeNames[d] : "";
}
function getScaledStandardType(d) {
    types = {};
    totalRowCount = 0;
    for (index in rowCount) {
        if (rowVisible[index]) {
            types[totalRowCount] = typeNames[index];
            totalRowCount += rowCount[index];
        }
    }
    return types[d];
}

// setup y
var yValue = function (d) {
    return d.parent.absoluteRow ? d.parent.absoluteRow : 0;
}; // data -> value
var yScale = d3.scale.linear(); // value -> display
var yMap = function (d) {
    return yScale(yValue(d))/* + d.parent.row * 32- 0.5 * height / 5*/;
}; // data -> display
var yAxis = d3.svg.axis().scale(yScale)
    .tickFormat(getScaledStandardType)
    .orient("right");

var widthValue = function(d) {
    return Math.max(d.parent.shortName.length, d.version.length, 4) * 8;
}
var opacityValue = function(d) {
    return rowVisible[d.type] ? 1 : 0;
}
var displayValue = function(d) {
    return rowVisible[d.type] ? '' : 'none';
}
var linkOpacityValue = function(d) {
    return linkDataVisibleValue(d) ? 1 : 0;
}
var linkDisplayValue = function(d) {
    return linkDataVisibleValue(d) ? '' : 'none';
}
var linkDataVisibleValue = function(d) {
    return rowVisible[d.source.parent.type] && rowVisible[d.target.parent.type];
}

// setup fill color
var cValue = function (d) {
        if ((d.details.status.indexOf("old") !== -1) || (d.details.status.indexOf("Old") !== -1)) {
            return "Old Specification";
        }
        return d.parent.standard_type;
    },
    cMap = function(d) {
        if ((d.indexOf("old") !== -1) || (d.indexOf("Old") !== -1)) {
            return "#999";
        } else {
            return color(d);
        }
    }
color = d3.scale.category10();
var sValue = function(d) {
        return d.details.status;
    },
    sMap = function(d) {
        if (d.indexOf("Candidate") !== -1) {
            return "5,5";
        } else {
            return "1,0";
        }
    };

// Create an svg path for the link d
function linkPathGenerator(d) {
    var path = d3.path();
    var coords = {
        "source": d.source.id,
        "target": d.usedOPCUAPart,
        "x1": xMap(d.source),
        "y1": yMap(d.source),
        "x2": xMap(d.target),
        "y2": yMap(d.target),
        "w1": widthValue(d.source),
        "w2": widthValue(d.target)
    };
    if (coords.y1 === coords.y2){
        if (coords.x2 + coords.w2 + 30 > coords.x1) {
            path.moveTo(coords.x1 + coords.w1/3, coords.y1 + 14);
            path.bezierCurveTo(coords.x1 + coords.w1/3 - 10, coords.y1 + 40, coords.x2 + coords.w2 * 2 / 3  + 10, coords.y2 + 40, coords.x2 + coords.w2 * 2 / 3, coords.y2 + 20);
        } else {
            path.moveTo(coords.x1, coords.y1);
            path.lineTo(coords.x2 + coords.w2 + 10, coords.y2);
        }
    } else {
        if (coords.y1 < coords.y2) {
            path.moveTo(coords.x1, coords.y1);
            path.bezierCurveTo(coords.x1 - 10, coords.y1, coords.x2 + 25, coords.y2 - 50, coords.x2 + 25, coords.y2 - 20);
        } else {
            path.moveTo(coords.x1, coords.y1);
            path.bezierCurveTo(coords.x1 - 10, coords.y1, coords.x2 + 25, coords.y2 + 50, coords.x2 + 25, coords.y2 + 20);
        }
    }
    return path.toString();
}

// Calculate all element's positions
function setScale(isInit = false) {
    var animTime = 100;
    yScale.domain([-2, totalRowCount - 1]);
    yAxis.ticks(totalRowCount + 2);
    var spanTotalX = lastDay.getTime() - firstDay.getTime();
    var spanX = spanTotalX / zoom;
    xScale.domain([firstDay.getTime() + (spanTotalX * scrollX) - (spanX / 2), firstDay.getTime() + (spanTotalX * scrollX) + (spanX / 2)]);
    svg.select("g.x")
        .call(xAxis);
    svg.select("g.y")
        .call(yAxis);
    svg.selectAll(".spec")
        .attr("display", '');
    svg.selectAll(".spec").transition('setScale').duration(isInit ? 0 : animTime)
        .attr("opacity", opacityValue);
    svg.selectAll(".spec").transition('setScale').duration(0).delay(animTime)
        .attr("display", displayValue);
    var dots = svg.selectAll(".dot").transition('setScale').duration(isInit ? 0 : animTime);
    dots.select("rect")
        .attr("x", xMap)
        .attr("y", function (d) {
            return yMap(d) - 14
        });

    dots.select("tspan")
        .attr("x", function (d) {
            return xMap(d) + 3
        })
        .attr("y", function (d) {
            return yMap(d) - 5;
        })
        .select("tspan")
        .attr("x", function (d) {
            return xMap(d) + 3
        })
        .attr("y", function (d) {
            return yMap(d) + 10
        });

    svg.selectAll(".typeBars").transition('setScale').duration(isInit ? 0 : animTime)
        .attr("x", 0)
        .attr("y", function(d) {
            return yScale(rowOffsets[d[0]] + d[1] - 0.5);
        })
        .attr("width", width)
        .attr("height", function(d) {
            return yScale(rowOffsets[d[0]]) - yScale(rowOffsets[d[0]] + d[1]);
        })
        .attr("opacity", function(d) {
            return rowVisible[d[0]] ? 1 : 0
        })
        .style("fill", function(d,i) {
            return (i % 2) ? "#eee" : "none";
        });

    var links = svg.selectAll(".link");
    links.attr("data-visible", linkDataVisibleValue);
    links.attr("display", '');
    links.transition('setScale').duration(isInit ? 0 : animTime)
        .attr("d", linkPathGenerator)
        .attr("opacity", linkOpacityValue);
    links.transition('setScale').duration(0).delay(animTime)
        .attr("display", linkDisplayValue); // Set display value so invisible elements won't receive mouse events
}

function calculateAbsoluteRows(data) {
    totalRowCount = 0;
    for (var index in rowCount) {
        if (rowVisible[index]) {
            rowOffsets[index] = totalRowCount;
            for (var index2 in data.opcua) {
                var item = data.opcua[index2];
                if (item.type == index)
                    item.absoluteRow = totalRowCount + item.row;
            }
            totalRowCount += rowCount[index];
        }
    }
}

var graphOffset = 0;
var graphOffsetNode = document.getElementById('graph');
function updateOffsets() {
    graphOffset = 0;
    graphOffsetNode = document.getElementById('graph');
    while (graphOffsetNode != null) {
        if (graphOffsetNode.offsetLeft) {
            graphOffset += graphOffsetNode.offsetLeft;
            graphOffsetNode = graphOffsetNode.offsetParent;
        } else {
            graphOffsetNode = graphOffsetNode.parentElement;
        }
    }
    outerWidth = document.getElementById('graphContainer').clientWidth, outerHeight = 900,
        width = outerWidth - margin.left - margin.right,
        height = outerHeight - margin.top - margin.bottom;
    xScale.range([0, width - 100]);
    yScale.range([height, 0]);
    d3.select('#graph').attr("viewBox", "0 0 "+ outerWidth +" "+ outerHeight);
}

function versionMap(spec, version) {
    return {"id": spec.id + "_" + version[0].replace(/\./g, "_"), "parent": spec, "version": version[0], "details": version[1]};
}

// Map all versions of a spec to a flat array with every element containing
// all necessary information
function versionArr(spec) {
    return Array.from(Object.entries(spec.versions)).map(function(version) {
        return versionMap(spec, version);
    });
}

updateOffsets();

var filters = d3.select("#filter")
    .selectAll(".filteritem")
    .data(Array.from(Object.entries(typeNames)).reverse())
    .enter()
    .append("label")
    .attr("for", function(d) {
        return "filter-" + d[0];
    })
    .attr("class", "filteritem")
    .append("input")
    .attr("type", "checkbox")
    .attr("id", function(d) { return "filter-" + d[0]; })
    .attr("name", "filter")
    .attr("value", function(d) {return d[0];})
    .attr("checked", function(d) { return rowVisible[d[0]] ? 'checked' : undefined; })
    .on("change", function(d) {
        rowVisible[d[0]] = this.checked;
        calculateAbsoluteRows(opcua_data);
        setScale();
    })
    .select(function() { return this.parentElement; })
    .append("span")
    .text(function(d) { return d[1]; });


// add the graph canvas to the body of the webpage
var svg = d3.select("#graph")
    .attr("preserveAspectRatio", "xMinYMin meet")
    .attr("viewBox", "0 0 "+ outerWidth +" "+ outerHeight)
    .append("g")
    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

// add the tooltip area to the webpage
var tooltip = d3.select("#graph").append("div")
    .attr("class", "tooltip")
    .style("opacity", 0);

var firstDay = new Date('1/1/2006');
var lastDay = new Date();
var zoom = 1.0;
var scrollX = 0.5;
var scrollY = 0.5;

var hideTimeout = null;

// load data
d3.json("data/cs.json", function (error, data) {
    opcua_data = data;
    setScale(true);

    // Calculate y offset spec stream
    // First, calculate width extends of a spec with all its versions
    for (var index in data.opcua) {
        var item = data.opcua[index];
        item.minX = Math.min.apply(null, versionArr(item).map(function(v) {
            return xMap(v);
        }));
        item.maxX = Math.max.apply(null, versionArr(item).map(function(v) {
            return xMap(v) + widthValue(v);
        }));
    }
    // Then, calculate then minimal offset where the whole series fits
    for (var index in data.opcua) {
        var item = data.opcua[index];
        item.row = 0;
        do {
            var success = true;
            for (var index2 in data.opcua) {
                if (index == index2)
                    break;
                var item2 = data.opcua[index2];
                if (item.type != item2.type)
                    continue;
                if (item2.row == item.row) {
                    if (item.maxX > item2.minX && item.minX < item2.maxX) {
                        item.row += 1;
                        success = false;
                        break;
                    }
                }
            }
        } while (!success);
        if (rowCount[item.type] <= item.row)
            rowCount[item.type] = item.row + 1;
    }
    calculateAbsoluteRows(data);

    svg.selectAll(".typeBars")
        .data(Array.from(Object.entries(rowCount)))
        .enter()
        .append("rect")
        .attr("class", "typeBars");

    // x-axis
    svg.append("g")
        .attr("class", "x axis")
        .attr("transform", "translate(0," + height + ")")
        .call(xAxis)
        .append("text")
        .attr("class", "label")
        .attr("x", width)
        .attr("y", -6)
        .style("text-anchor", "end")
        .text("Datum");

    // y-axis
    svg.append("g")
        .attr("class", "y axis")
        .call(yAxis)
        .append("text")
        .attr("class", "label")
        .attr("transform", "rotate(-90)")
        .attr("y", 6)
        .attr("dy", ".71em")
        .style("text-anchor", "end")
        .text("Type");

    svg.selectAll(".tick text")
        .style("text-anchor", "start")
        .attr("x", 2);

    // Get all nodes...
    dots = data.opcua.map(function(spec) {
        return versionArr(spec);
    });
    // ...as flat array
    dots = Array.prototype.concat.apply([], dots);

    // Generate dependency links...
    linkArray = dots.map(function (value) {
        retValues = [];
        for (var j = 0; j < value.details.usedOPCUAPart.length; j++) {
            if (value.details.usedOPCUAPart[j] == undefined) {
                return;
            }
            var targetId = value.details.usedOPCUAPart[j];
            if (typeof(targetId) == "object") {
                targetId = targetId.id + '_' + targetId.version.replace(/\./g, '_');
            }
            var target = undefined
            for (var i = 0; i < dots.length; i++) {
                if (dots[i].id === targetId) {
                    target = dots[i];
                }
            }

            retValues.push({
                "source": value,
                "usedOPCUAPart": value.details.usedOPCUAPart[j],
                "target": target
            });
        }
        return retValues;
    });
    // ...as flat array
    linkArray = Array.prototype.concat.apply([], linkArray);

    // Prepare info box
    d3.select("#info").on("mouseover", function(d) {
        clearTimeout(hideTimeout);
    })
        .on("mouseout", function(d) {
            clearTimeout(hideTimeout);
            hideTimeout = setTimeout(function() {
                svg.selectAll(".dot").transition().duration(200).attr("opacity", 1);
                svg.selectAll(".link").filter(linkDataVisibleValue).transition().duration(200).attr("opacity", 1);
                d3.select("#info").transition().duration(200).style("opacity", 0);
                d3.select("#info").transition().delay(200).style("display", "none");
            }, 500);
        });
    d3.select("#info").style("opacity", 0);

    // Generate svg elements for links
    svg.selectAll(".link")
        .data(linkArray)
        .enter().append("path")
        .attr("class", function(d) {
            return "link link-from-" + d.source.id;
        })
        .attr("d", linkPathGenerator)
        .on("mouseover", function(d) {
            svg.selectAll(".link").filter(linkDataVisibleValue).filter(function(dd,i){ return dd != d; }).transition().duration(200).attr("opacity", 0.2);
            svg.selectAll(".dot").filter(function(dd,i) { return dd.id != d.source.id && dd.id != d.target.id }).transition().duration(200).attr("opacity", 0.2);
        })
        .on("mouseout", function(d) {
            svg.selectAll(".dot").transition().duration(200).attr("opacity", 1);
            svg.selectAll(".link").filter(linkDataVisibleValue).transition().duration(200).attr("opacity", 1);
        })
        .style("fill", "none")
        .attr("marker-end", "url(#arrowUsed");

    // Generate svg elements for specs...
    svg.selectAll(".spec")
        .data(data.opcua)
        .enter().append("g")
        .attr("class", "spec")
        .attr("id", function(d) {
            return "spec-" + d.id
        })
        .selectAll(".dot") // ...and their versions
        .data(function(d) {
            return versionArr(d);
        })
        .enter().append("g")
        .attr("class", "dot")
        .attr("id", function(d) {
            return "dot-" + d.id;
        })
        .on("mouseover", function(d) {
            svg.selectAll(".dot").filter(function(dd,i){ return dd == d; }).transition().duration(200).attr("opacity", 1);
            svg.selectAll(".dot").filter(function(dd,i){ return dd != d; }).transition().duration(200).attr("opacity", 0.2);
            svg.selectAll(".link").filter(linkDataVisibleValue).transition().duration(200).attr("opacity", 0.2);
            svg.selectAll(".link-from-" + d.id).filter(linkDataVisibleValue).transition().duration(200).attr("opacity", 1);
            d3.select("#info").html(object2html(mapDisplayData(d))).transition().duration(200).style("opacity", 0.8);
            d3.select("#info").style("display", "block");
            var ge = document.getElementById("graph");
            var ge_cr = ge.getBoundingClientRect();
            ge_cr.width  -= Number(d3.select('#graph').style('padding-left').replace('px', '')) + Number(d3.select('#graph').style('padding-right').replace('px', ''));
            ge_cr.height -= Number(d3.select('#graph').style('padding-top' ).replace('px', '')) + Number(d3.select('#graph').style('padding-bottom').replace('px', ''));
            ge_cr.left   += Number(d3.select('#graph').style('padding-left').replace('px', ''));
            ge_cr.top    += Number(d3.select('#graph').style('padding-top' ).replace('px', ''));
            var infobox_cr = document.getElementById("info").getBoundingClientRect();
            if (yMap(d) > height / 2) {
                d3.select("#info")
                    .style('left', xMap(d)*ge_cr.width/ge.viewBox.animVal.width+'px')
                    .style('top', 6 + yMap(d)*ge_cr.height/ge.viewBox.animVal.height - infobox_cr.height +'px');
            } else {
                d3.select("#info")
                    .style('left', xMap(d)*ge_cr.width/ge.viewBox.animVal.width+'px')
                    .style('top', 36 + yMap(d)*ge_cr.height/ge.viewBox.animVal.height+'px');
            }
            clearTimeout(hideTimeout);
        })
        .on("mouseout", function(d) {
            clearTimeout(hideTimeout);
            hideTimeout = setTimeout(function() {
                svg.selectAll(".dot").transition().duration(200).attr("opacity", 1);
                svg.selectAll(".link").filter(linkDataVisibleValue).transition().duration(200).attr("opacity", 1);
                d3.select("#info").transition().duration(200).style("opacity", 0);
                d3.select("#info").transition().delay(200).style("display", "none");
            }, 500);
        })
        .append("rect")
        .attr("width", widthValue)
        .attr("height", 28)
        .attr("rx", 5)
        .attr("ry", 5)
        .style("stroke", function (d) {
            return cMap(cValue(d));
        })
        .style("fill", "#fff")
        .style("stroke-width", function (d) {
            return "2";
        })
        .style("stroke-dasharray", function(d) {
            return sMap(sValue(d));
        })
        .select(function() { return this.parentElement; })
        .append("text")
        .attr("dy", ".35em")
        .style("text-anchor", "start")
        .append("tspan")
        .text(function (d) {
            return d.parent.shortName.length < 20 ? d.parent.shortName : d.parent.shortName.substr(0, 5) + "...";
        }).append("tspan")
        .text(function (d) {
            return d.version;
        });

    // draw legend
    var legend = svg.selectAll(".legend")
        .data(["Old Specification"].concat(color.domain()))
        .enter().append("g")
        .attr("class", "legend")
        .attr("transform", function (d, i) {
            return "translate(" + (10 + i * width/4) + ", 0)";
        });

    // draw legend colored rectangles
    legend.append("rect")
        .attr("x", 0)
        .attr("y", height - 30)
        .attr("width", 18)
        .attr("height", 18)
        .attr("rx", 5)
        .attr("ry", 5)
        .style("stroke", cMap)
        .style("fill", "#fff")
        .style("stroke-width", "2");

    // draw legend text
    legend.append("text")
        .attr("x", 25)
        .attr("y", height - 25)
        .attr("dy", ".35em")
        .style("text-anchor", "start")
        .text(function (d) {
            return d;
        });
    var sLegend = svg.selectAll(".slegend")
        .data(["a"])
        .enter().append("g")
        .attr("class", "legend");
    sLegend.append("rect")
        .attr("x", 10 + width * 3 / 4 )
        .attr("y", height - 30)
        .attr("width", 18)
        .attr("height", 18)
        .attr("rx", 5)
        .attr("ry", 5)
        .style("stroke", "#999")
        .style("fill", "#fff")
        .style("stroke-width", "2")
        .style("stroke-dasharray", "5,5");
    sLegend.append("text")
        .attr("x", 35 + width * 3 / 4 )
        .attr("y", height - 25)
        .attr("dy", ".35em")
        .text("Release Candidate");
    setScale(true);
});

function zoomRelative(delta, offsetX) {
    var parWidth = document.getElementById('graph').parentElement.clientWidth;
    //                  translation of outer g  width reduction of scale
    //                             |                     |
    var offsetDeltaX = ((offsetX - 20) * 1.0 / (width - 100) - 0.5);
    scrollX += offsetDeltaX / zoom / zoom * delta * 0.0002;// + scrollX * (1.0 - 1.0/zoom);
    zoom = zoom + delta * 0.0002;
    zoom = Math.max(1.0, Math.min(zoom, 10.0));
    scrollX = Math.min(1.0 - 0.5 / zoom, Math.max(0.5 / zoom, scrollX));
    setScale();
}

// Register an event for scrolling to zoom the x axis
function scrollEvent(e) {
    var evt = window.event || e;
    var delta = evt.detail ? evt.detail*(-120) : evt.wheelDelta;
    var old_zoom = zoom;
    // absolute page coordinate  offset of div
    //               |             |
    var offsetX = e.pageX - graphOffset;
    zoomRelative(delta, offsetX);
    if (zoom != old_zoom)
        evt.preventDefault();
};
var svgDOM = document.getElementById("graph");
svgDOM.addEventListener("mousewheel", scrollEvent);
svgDOM.addEventListener("DOMMouseScroll", scrollEvent);

// Zoom via gesture
var prevDiff = -1;
var prevX = -1;
svgDOM.ontouchstart = function(e) {
}
svgDOM.ontouchend = function(e) {
    if (e.touches.length <= 2) prevDiff = -1;
    if (e.touches.length <= 1) prevX = -1;
}
svgDOM.ontouchmove = function(e) {
    if (e.touches.length == 1) {
        if (prevX > 0) {
            var offsetDeltaX = ((e.touches[0].pageX - prevX) * -1 / document.getElementById('graph').parentElement.clientWidth);
            scrollX += offsetDeltaX / zoom;
            scrollX = Math.min(1.0 - 0.5 / zoom, Math.max(0.5 / zoom, scrollX));
            setScale();
        }
        prevX = e.touches[0].pageX;
    } else if (e.touches.length == 2) {
        var curDiff = Math.abs(e.touches[0].pageX - e.touches[1].pageX) * 100;
        var curX = (e.touches[0].pageX + e.touches[1].pageX) / 2;

        if (prevDiff > 0) {
            zoomRelative(curDiff - prevDiff, curX - graphOffset);
        }

        // Cache the distance for the next move event
        prevDiff = curDiff;
        e.preventDefault();
    }
}

// Window resize handling
window.onresize = function(e) {
    updateOffsets();
    setScale();
}
