import React, { useEffect, useRef, useState, useMemo } from "react";
import { fabric } from "fabric";

const INCH_TO_PIXEL_RATIO = 20;
const CANVAS_WIDTH = 60 * INCH_TO_PIXEL_RATIO;
const CANVAS_HEIGHT = 44 * INCH_TO_PIXEL_RATIO;
const GRID_SIZE = 1 * INCH_TO_PIXEL_RATIO;
const MAJOR_GRID_SIZE = 4 * INCH_TO_PIXEL_RATIO;

const MissionMapBuilder = () => {
  const canvasRef = useRef(null);
  const [canvas, setCanvas] = useState(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [points, setPoints] = useState([]);
  const [tempMarkers, setTempMarkers] = useState([]);
  const [tempLines, setTempLines] = useState([]);
  const [pendingPoints, setPendingPoints] = useState(null);
  const [showZoneDialog, setShowZoneDialog] = useState(false);
  const [selectedObject, setSelectedObject] = useState(null);
  const [showCenterMarker, setShowCenterMarker] = useState(true);
  const centerMarkerRef = useRef(null);

  // Create ruler marks for horizontal and vertical rulers
  const horizontalRulerMarks = useMemo(() => {
    const marks = [];
    for (let i = 0; i <= CANVAS_WIDTH; i += MAJOR_GRID_SIZE) {
      marks.push(i / INCH_TO_PIXEL_RATIO);
    }
    return marks;
  }, []);

  const verticalRulerMarks = useMemo(() => {
    const marks = [];
    for (let i = 0; i <= CANVAS_HEIGHT; i += MAJOR_GRID_SIZE) {
      marks.push(i / INCH_TO_PIXEL_RATIO);
    }
    return marks;
  }, []);

  useEffect(() => {
    if (!canvasRef.current) return;

    // Clear any existing canvas instance
    if (canvas) {
      canvas.dispose();
    }

    const newCanvas = new fabric.Canvas(canvasRef.current, {
      width: CANVAS_WIDTH,
      height: CANVAS_HEIGHT,
      backgroundColor: "#FFF8E7",  // Cream color
      selection: true,
      preserveObjectStacking: true,
      renderOnAddRemove: true
    });

    // Draw grid
    for (let i = 0; i <= CANVAS_WIDTH; i += GRID_SIZE) {
      newCanvas.add(new fabric.Line([i, 0, i, CANVAS_HEIGHT], {
        stroke: "#ddd",
        selectable: false,
        evented: false,
        hoverCursor: 'default'
      }));
    }
    for (let i = 0; i <= CANVAS_HEIGHT; i += GRID_SIZE) {
      newCanvas.add(new fabric.Line([0, i, CANVAS_WIDTH, i], {
        stroke: "#ddd",
        selectable: false,
        evented: false,
        hoverCursor: 'default'
      }));
    }

    // Draw major grid lines
    for (let i = 0; i <= CANVAS_WIDTH; i += MAJOR_GRID_SIZE) {
      newCanvas.add(new fabric.Line([i, 0, i, CANVAS_HEIGHT], {
        stroke: "#999",
        strokeWidth: 2,
        selectable: false,
        evented: false,
        hoverCursor: 'default'
      }));
    }
    for (let i = 0; i <= CANVAS_HEIGHT; i += MAJOR_GRID_SIZE) {
      newCanvas.add(new fabric.Line([0, i, CANVAS_WIDTH, i], {
        stroke: "#999",
        strokeWidth: 2,
        selectable: false,
        evented: false,
        hoverCursor: 'default'
      }));
    }

    // Create center marker (initially hidden)
    const centerX = CANVAS_WIDTH / 2;
    const centerY = CANVAS_HEIGHT / 2;
    const centerMarker = new fabric.Group([
      new fabric.Circle({
        radius: 10,
        fill: 'transparent',
        stroke: '#FF4444',
        strokeWidth: 2,
        originX: 'center',
        originY: 'center'
      }),
      new fabric.Line([-15, 0, 15, 0], {
        stroke: '#FF4444',
        strokeWidth: 2,
        originX: 'center',
        originY: 'center'
      }),
      new fabric.Line([0, -15, 0, 15], {
        stroke: '#FF4444',
        strokeWidth: 2,
        originX: 'center',
        originY: 'center'
      })
    ], {
      left: centerX,
      top: centerY,
      originX: 'center',
      originY: 'center',
      selectable: false,
      evented: false,
      visible: false
    });

    newCanvas.add(centerMarker);
    centerMarkerRef.current = centerMarker;

    // Add selection event listeners
    newCanvas.on('selection:created', (options) => {
      setSelectedObject(options.selected[0]);
    });

    newCanvas.on('selection:updated', (options) => {
      setSelectedObject(options.selected[0]);
    });

    newCanvas.on('selection:cleared', () => {
      setSelectedObject(null);
    });

    newCanvas.renderAll();
    setCanvas(newCanvas);

    return () => {
      newCanvas.dispose();
    };
  }, []);

  useEffect(() => {
    if (!canvas || !centerMarkerRef.current) return;
    centerMarkerRef.current.set('visible', showCenterMarker);
    canvas.renderAll();
  }, [canvas, showCenterMarker]);

  useEffect(() => {
    if (!canvas || !isDrawing) return;

    const handleCanvasClick = (options) => {
      const pointer = canvas.getPointer(options.e);
      const x = Math.round(pointer.x / GRID_SIZE) * GRID_SIZE;
      const y = Math.round(pointer.y / GRID_SIZE) * GRID_SIZE;

      const marker = new fabric.Circle({
        left: x,
        top: y,
        radius: 5,
        fill: 'white',
        stroke: 'red',
        strokeWidth: 2,
        selectable: false,
        evented: false
      });

      canvas.add(marker);
      canvas.renderAll();
      
      setTempMarkers(prev => [...prev, marker]);
      
      const newPoints = [...points, { x, y }];

      if (points.length > 0) {
        const line = new fabric.Line(
          [points[points.length - 1].x, points[points.length - 1].y, x, y],
          { 
            stroke: 'red',
            strokeWidth: 2,
            selectable: false,
            evented: false
          }
        );
        canvas.add(line);
        canvas.renderAll();
        setTempLines(prev => [...prev, line]);
      }

      if (points.length > 1 && 
          Math.abs(x - points[0].x) < GRID_SIZE && 
          Math.abs(y - points[0].y) < GRID_SIZE) {
        const closingLine = new fabric.Line(
          [x, y, points[0].x, points[0].y],
          { 
            stroke: 'red',
            strokeWidth: 2,
            selectable: false,
            evented: false
          }
        );
        canvas.add(closingLine);
        canvas.renderAll();
        setTempLines(prev => [...prev, closingLine]);
        setPendingPoints([...newPoints]);
        setShowZoneDialog(true);
        return;
      }

      setPoints(newPoints);
    };

    canvas.on('mouse:down', handleCanvasClick);
    
    return () => {
      canvas.off('mouse:down', handleCanvasClick);
    };
  }, [canvas, isDrawing, points]);

  const startDrawingZone = () => {
    if (!canvas) return;
    setIsDrawing(true);
    setPoints([]);
    setTempLines([]);
    setTempMarkers([]);
    setPendingPoints(null);
    setShowZoneDialog(false);
    canvas.selection = false;
    canvas.defaultCursor = 'crosshair';
    canvas.hoverCursor = 'crosshair';
    canvas.renderAll();
  };

  const createZone = (type) => {
    if (!canvas || !pendingPoints || pendingPoints.length < 3) return;
    
    tempLines.forEach(line => canvas.remove(line));
    tempMarkers.forEach(marker => canvas.remove(marker));
    
    const polygonPoints = pendingPoints.map(p => ({ x: p.x, y: p.y }));
    
    const polygon = new fabric.Polygon(polygonPoints, {
      fill: type === "attacker" ? "rgba(255, 0, 0, 0.3)" : "rgba(0, 255, 0, 0.3)",
      stroke: null,
      selectable: true,
      hasControls: true,
      hasBorders: true,
      name: `${type}_zone`
    });

    canvas.defaultCursor = 'default';
    canvas.hoverCursor = 'move';
    canvas.selection = true;

    canvas.add(polygon);
    canvas.renderAll();
    
    setPoints([]);
    setTempLines([]);
    setTempMarkers([]);
    setPendingPoints(null);
    setShowZoneDialog(false);
    setIsDrawing(false);
  };

  const addObjectiveMarker = () => {
    if (!canvas) return;
    
    const circle = new fabric.Circle({
      left: CANVAS_WIDTH / 2 - GRID_SIZE,
      top: CANVAS_HEIGHT / 2 - GRID_SIZE,
      radius: GRID_SIZE,
      fill: "red",
      stroke: null,
      selectable: true,
      hasControls: true,
      hasBorders: true,
      name: 'objective'
    });

    canvas.add(circle);
    canvas.renderAll();
  };

  const addDeploymentZone = (type) => {
    if (!canvas) return;
    
    const points = type === "attacker" 
      ? [
          { x: 0, y: 0 },
          { x: CANVAS_WIDTH / 4, y: 0 },
          { x: CANVAS_WIDTH / 4, y: CANVAS_HEIGHT },
          { x: 0, y: CANVAS_HEIGHT }
        ]
      : [
          { x: CANVAS_WIDTH, y: 0 },
          { x: CANVAS_WIDTH * 3/4, y: 0 },
          { x: CANVAS_WIDTH * 3/4, y: CANVAS_HEIGHT },
          { x: CANVAS_WIDTH, y: CANVAS_HEIGHT }
        ];

    const polygon = new fabric.Polygon(points, {
      fill: type === "attacker" ? "rgba(255, 0, 0, 0.3)" : "rgba(0, 255, 0, 0.3)",
      stroke: null,
      selectable: true,
      hasControls: true,
      hasBorders: true,
      name: `${type}_zone`
    });

    canvas.add(polygon);
    canvas.renderAll();
  };

  const addMeasurementLine = (isVertical = false) => {
    if (!canvas) return;

    const line = new fabric.Line(
      isVertical ? [50, 50, 50, 150] : [50, 50, 150, 50],
      {
        stroke: 'blue',
        strokeWidth: 1,
        strokeDashArray: [5, 5],
        name: 'measurement_line',
        selectable: true,
        hasControls: true,
        hasBorders: true,
        padding: 10,
        cornerSize: 8,
        cornerColor: 'blue',
        cornerStyle: 'circle',
        transparentCorners: false,
        hasRotatingPoint: false,
        lockRotation: true,
        lockScalingFlip: true,
        centeredScaling: false
      }
    );

    // Set up controls to only allow scaling in the correct direction
    if (isVertical) {
      line.setControlsVisibility({
        mt: true,  // middle top
        mb: true,  // middle bottom
        ml: false, // middle left
        mr: false, // middle right
        bl: false, // bottom left
        br: false, // bottom right
        tl: false, // top left
        tr: false, // top right
        mtr: false // rotation point
      });
    } else {
      line.setControlsVisibility({
        mt: false, // middle top
        mb: false, // middle bottom
        ml: true,  // middle left
        mr: true,  // middle right
        bl: false, // bottom left
        br: false, // bottom right
        tl: false, // top left
        tr: false, // top right
        mtr: false // rotation point
      });
    }

    const text = new fabric.IText('0.0"', {
      left: isVertical ? line.left + 10 : line.left + (line.width / 2),
      top: isVertical ? line.top + (line.height / 2) : line.top - 25,
      fontSize: 14,
      fill: 'blue',
      backgroundColor: 'rgba(255,255,255,0.8)',
      name: 'measurement_text',
      selectable: true,
      hasControls: true,
      hasBorders: true,
      editable: true,
      padding: 5
    });

    canvas.add(line);
    canvas.add(text);
    canvas.renderAll();
  };

  const groupSelected = () => {
    if (!canvas) return;
    const activeSelection = canvas.getActiveObject();
    if (!activeSelection || !activeSelection.type === 'activeSelection') return;
    activeSelection.toGroup();
    canvas.renderAll();
  };

  const ungroupSelected = () => {
    if (!canvas) return;
    const activeObject = canvas.getActiveObject();
    if (!activeObject || activeObject.type !== 'group') return;
    activeObject.toActiveSelection();
    canvas.renderAll();
  };

  const deleteSelected = () => {
    if (!canvas) return;
    const activeObject = canvas.getActiveObject();
    if (!activeObject) return;
    canvas.remove(activeObject);
    canvas.renderAll();
    setSelectedObject(null);
  };

  const saveMap = () => {
    if (!canvas) return;
    const json = canvas.toJSON(['name']);
    const blob = new Blob([JSON.stringify(json)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'mission_map.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const loadMap = () => {
    if (!canvas) return;
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = e.target.files[0];
      if (!file) return;
      
      const reader = new FileReader();
      reader.onload = (e) => {
        const json = JSON.parse(e.target.result);
        canvas.loadFromJSON(json, () => {
          canvas.renderAll();
        });
      };
      reader.readAsText(file);
    };
    input.click();
  };

  const exportAsPNG = () => {
    if (!canvas) return;
    const dataURL = canvas.toDataURL({
      format: 'png',
      quality: 1
    });
    const a = document.createElement('a');
    a.href = dataURL;
    a.download = 'mission_map.png';
    a.click();
  };

  return (
    <div>
      <h2>Warhammer 40K Mission Map Designer</h2>
      
      <div className="button-groups-container" style={{ display: 'flex', gap: '20px', justifyContent: 'center' }}>
        <div className="button-group" style={{ width: '200px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div className="button-group-title" style={{ textAlign: 'center', padding: '5px', backgroundColor: '#2c2c2c', borderRadius: '5px' }}>Deployment</div>
          <button onClick={addObjectiveMarker} style={{ width: '100%', padding: '8px', backgroundColor: '#3c3c3c', border: 'none', color: 'white', borderRadius: '5px', cursor: 'pointer' }}>Add Objective</button>
          <button onClick={() => addDeploymentZone("attacker")} style={{ width: '100%', padding: '8px', backgroundColor: '#3c3c3c', border: 'none', color: 'white', borderRadius: '5px', cursor: 'pointer' }}>Attacker Zone</button>
          <button onClick={() => addDeploymentZone("defender")} style={{ width: '100%', padding: '8px', backgroundColor: '#3c3c3c', border: 'none', color: 'white', borderRadius: '5px', cursor: 'pointer' }}>Defender Zone</button>
          <button onClick={startDrawingZone} style={{ width: '100%', padding: '8px', backgroundColor: '#3c3c3c', border: 'none', color: 'white', borderRadius: '5px', cursor: 'pointer' }}>Draw Zone</button>
        </div>

        <div className="button-group" style={{ width: '200px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div className="button-group-title" style={{ textAlign: 'center', padding: '5px', backgroundColor: '#2c2c2c', borderRadius: '5px' }}>Measurements</div>
          <button onClick={() => addMeasurementLine(false)} style={{ width: '100%', padding: '8px', backgroundColor: '#3c3c3c', border: 'none', color: 'white', borderRadius: '5px', cursor: 'pointer' }}>Horizontal</button>
          <button onClick={() => addMeasurementLine(true)} style={{ width: '100%', padding: '8px', backgroundColor: '#3c3c3c', border: 'none', color: 'white', borderRadius: '5px', cursor: 'pointer' }}>Vertical</button>
        </div>

        <div className="button-group" style={{ width: '200px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div className="button-group-title" style={{ textAlign: 'center', padding: '5px', backgroundColor: '#2c2c2c', borderRadius: '5px' }}>Edit</div>
          <button onClick={() => setShowCenterMarker(!showCenterMarker)} style={{ width: '100%', padding: '8px', backgroundColor: '#3c3c3c', border: 'none', color: 'white', borderRadius: '5px', cursor: 'pointer' }}>
            {showCenterMarker ? "Hide Center" : "Show Center"}
          </button>
          <button onClick={groupSelected} style={{ width: '100%', padding: '8px', backgroundColor: '#3c3c3c', border: 'none', color: 'white', borderRadius: '5px', cursor: 'pointer' }}>Group</button>
          <button onClick={ungroupSelected} style={{ width: '100%', padding: '8px', backgroundColor: '#3c3c3c', border: 'none', color: 'white', borderRadius: '5px', cursor: 'pointer' }}>Ungroup</button>
          <button onClick={deleteSelected} style={{ width: '100%', padding: '8px', backgroundColor: '#3c3c3c', border: 'none', color: 'white', borderRadius: '5px', cursor: 'pointer' }}>Delete</button>
        </div>

        <div className="button-group" style={{ width: '200px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div className="button-group-title" style={{ textAlign: 'center', padding: '5px', backgroundColor: '#2c2c2c', borderRadius: '5px' }}>Save/Export</div>
          <button onClick={saveMap} style={{ width: '100%', padding: '8px', backgroundColor: '#3c3c3c', border: 'none', color: 'white', borderRadius: '5px', cursor: 'pointer' }}>Save</button>
          <button onClick={loadMap} style={{ width: '100%', padding: '8px', backgroundColor: '#3c3c3c', border: 'none', color: 'white', borderRadius: '5px', cursor: 'pointer' }}>Load</button>
          <button onClick={exportAsPNG} style={{ width: '100%', padding: '8px', backgroundColor: '#3c3c3c', border: 'none', color: 'white', borderRadius: '5px', cursor: 'pointer' }}>Export</button>
        </div>
      </div>

      <div className="canvas-container" style={{ 
        position: 'relative', 
        padding: '35px 0 0 35px',
        backgroundColor: '#1E1E1E'  // Dark background for container
      }}>
        {/* Top ruler */}
        <div className="ruler top-ruler" style={{
          position: 'absolute',
          top: '0',
          left: '35px',
          width: `${CANVAS_WIDTH}px`,
          height: '15px',
          backgroundColor: '#2A2A2A',
          borderBottom: '2px solid #666',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          zIndex: 1
        }}>
          {horizontalRulerMarks.map((mark) => (
            <div key={`top-${mark}`} style={{
              position: 'absolute',
              left: `${mark * INCH_TO_PIXEL_RATIO}px`,
              width: '2px',
              height: '8px',
              bottom: '0',
              backgroundColor: '#CCC'
            }}>
              <span style={{
                position: 'absolute',
                top: '-18px',
                left: '-10px',
                fontSize: '14px',
                fontWeight: 'bold',
                color: '#CCC',
                width: '24px',
                textAlign: 'center',
                backgroundColor: '#2A2A2A',
                padding: '2px'
              }}>{mark}</span>
            </div>
          ))}
        </div>

        {/* Left ruler */}
        <div className="ruler left-ruler" style={{
          position: 'absolute',
          top: '35px',
          left: '0',
          width: '15px',
          height: `${CANVAS_HEIGHT}px`,
          backgroundColor: '#2A2A2A',
          borderRight: '2px solid #666',
          boxShadow: '1px 0 3px rgba(0,0,0,0.1)',
          zIndex: 1
        }}>
          {verticalRulerMarks.map((mark) => (
            <div key={`left-${mark}`} style={{
              position: 'absolute',
              top: `${mark * INCH_TO_PIXEL_RATIO}px`,
              height: '2px',
              width: '8px',
              right: '0',
              backgroundColor: '#CCC'
            }}>
              <span style={{
                position: 'absolute',
                left: '-30px',
                top: '-10px',
                fontSize: '14px',
                fontWeight: 'bold',
                color: '#CCC',
                width: '24px',
                textAlign: 'right',
                backgroundColor: '#2A2A2A',
                padding: '2px'
              }}>{mark}</span>
            </div>
          ))}
        </div>

        <div style={{ position: 'relative' }}>
          <canvas 
            ref={canvasRef} 
            width={CANVAS_WIDTH} 
            height={CANVAS_HEIGHT} 
            style={{ 
              border: '1px solid #666',
              backgroundColor: '#FFF8E7'  // Keep cream color for canvas only
            }} 
          />
        </div>

        {isDrawing && (
          <div className="drawing-tooltip">
            Drawing mode: Click to place points, click near the start point to finish
          </div>
        )}

        {showZoneDialog && (
          <div className="zone-dialog">
            <button onClick={() => createZone("attacker")}>Attacker Zone</button>
            <button onClick={() => createZone("defender")}>Defender Zone</button>
            <button onClick={() => {
              setShowZoneDialog(false);
              setIsDrawing(false);
              setPoints([]);
              setPendingPoints(null);
              tempLines.forEach(line => canvas.remove(line));
              tempMarkers.forEach(marker => canvas.remove(marker));
              canvas.renderAll();
            }}>Cancel</button>
          </div>
        )}
      </div>
    </div>
  );
};

export default MissionMapBuilder;
