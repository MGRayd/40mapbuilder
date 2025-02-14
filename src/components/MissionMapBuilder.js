import React, { useEffect, useRef, useState, useMemo, useCallback } from "react";
import { fabric } from "fabric";
import objectiveIcon from '../assets/Objective.svg';
import strikeObjectiveIcon from '../assets/StrikeObj.svg';
import attackerIcon from '../assets/Attacker.svg';
import defenderIcon from '../assets/Defender.svg';

// Preload images to ensure they're available when needed
const preloadImages = () => {
  const images = [objectiveIcon, strikeObjectiveIcon, attackerIcon, defenderIcon];
  return Promise.all(images.map(src => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = src;
    });
  }));
};

const INCH_TO_PIXEL_RATIO = 20;
const CANVAS_WIDTH = 60 * INCH_TO_PIXEL_RATIO;
const CANVAS_HEIGHT = 44 * INCH_TO_PIXEL_RATIO;
const GRID_SIZE = 1 * INCH_TO_PIXEL_RATIO;
const MAJOR_GRID_SIZE = 4 * INCH_TO_PIXEL_RATIO;

const MissionMapBuilder = () => {
  const canvasRef = useRef(null);
  const centerMarkerRef = useRef(null);
  const [canvas, setCanvas] = useState(null);
  const [selectedObject, setSelectedObject] = useState(null);
  const [showZoneDialog, setShowZoneDialog] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);
  const [points, setPoints] = useState([]);
  const [tempMarkers, setTempMarkers] = useState([]);
  const [tempLines, setTempLines] = useState([]);
  const [pendingPoints, setPendingPoints] = useState(null);
  const [showCenterMarker, setShowCenterMarker] = useState(true);
  const [customZoneColor, setCustomZoneColor] = useState('#e67e22');
  const [customZoneOpacity, setCustomZoneOpacity] = useState(0.6);
  const [showImageSettings, setShowImageSettings] = useState(false);
  const [imageOpacity, setImageOpacity] = useState(1);
  const [showDrawnZoneDialog, setShowDrawnZoneDialog] = useState(false);
  const [drawnZonePoints, setDrawnZonePoints] = useState(null);
  const [showDrawnZoneColorPicker, setShowDrawnZoneColorPicker] = useState(false);
  const [showCustomZoneColorPicker, setShowCustomZoneColorPicker] = useState(false);
  const [rectangleZonePreview, setRectangleZonePreview] = useState(null);

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

    // Set global control properties for all objects
    fabric.Object.prototype.set({
      cornerColor: '#ff3b30',
      cornerStrokeColor: '#ffffff',
      cornerSize: 14,
      cornerStyle: 'circle',
      borderColor: '#ff3b30',
      transparentCorners: false,
      cornerDashArray: null,
      borderDashArray: null,
      borderScaleFactor: 2,
      padding: 10
    });

    const newCanvas = new fabric.Canvas(canvasRef.current, {
      width: CANVAS_WIDTH,
      height: CANVAS_HEIGHT,
      backgroundColor: '#d9d8d1',
      preserveObjectStacking: true,
      renderOnAddRemove: true,
      selection: true,
      selectionColor: 'rgba(100, 100, 255, 0.15)',
      selectionBorderColor: 'rgba(100, 100, 255, 0.45)',
      selectionLineWidth: 1
    });

    // Draw grid
    for (let i = 0; i <= CANVAS_WIDTH; i += GRID_SIZE) {
      newCanvas.add(new fabric.Line([i, 0, i, CANVAS_HEIGHT], {
        stroke: "#333333",
        strokeWidth: i % MAJOR_GRID_SIZE === 0 ? 1 : 0.5,
        selectable: false,
        evented: false,
        hoverCursor: 'default',
        name: 'grid_line'
      }));
    }
    for (let i = 0; i <= CANVAS_HEIGHT; i += GRID_SIZE) {
      newCanvas.add(new fabric.Line([0, i, CANVAS_WIDTH, i], {
        stroke: "#333333",
        strokeWidth: i % MAJOR_GRID_SIZE === 0 ? 1 : 0.5,
        selectable: false,
        evented: false,
        hoverCursor: 'default',
        name: 'grid_line'
      }));
    }

    // Draw major grid lines
    for (let i = 0; i <= CANVAS_WIDTH; i += MAJOR_GRID_SIZE) {
      newCanvas.add(new fabric.Line([i, 0, i, CANVAS_HEIGHT], {
        stroke: "#444444",
        strokeWidth: 1.5,
        selectable: false,
        evented: false,
        hoverCursor: 'default',
        name: 'grid_line_major'
      }));
    }
    for (let i = 0; i <= CANVAS_HEIGHT; i += MAJOR_GRID_SIZE) {
      newCanvas.add(new fabric.Line([0, i, CANVAS_WIDTH, i], {
        stroke: "#444444",
        strokeWidth: 1.5,
        selectable: false,
        evented: false,
        hoverCursor: 'default',
        name: 'grid_line_major'
      }));
    }

    // Create center marker
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
      visible: false,
      name: 'center_marker'
    });

    newCanvas.add(centerMarker);
    centerMarkerRef.current = centerMarker;

    // Add selection event listeners
    newCanvas.on('selection:created', (options) => {
      setSelectedObject(options.selected ? options.selected[0] : null);
    });

    newCanvas.on('selection:updated', (options) => {
      setSelectedObject(options.selected ? options.selected[0] : null);
    });

    newCanvas.on('selection:cleared', () => {
      setSelectedObject(null);
    });

    // Add keyboard event listeners for multi-selection
    const handleKeyDown = (e) => {
      if (!newCanvas) return;
      
      if (e.shiftKey) {
        newCanvas.selection = true;
        newCanvas.discardActiveObject();
        newCanvas.renderAll();
      }
    };

    const handleKeyUp = (e) => {
      if (!newCanvas) return;
      
      if (!e.shiftKey) {
        const activeSelection = newCanvas.getActiveObject();
        if (activeSelection && activeSelection.type === 'activeSelection') {
          newCanvas.discardActiveObject();
        }
        newCanvas.renderAll();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    setCanvas(newCanvas);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
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
      if (!isDrawing) return;

      const pointer = canvas.getPointer(options.e);
      const clickPoint = { x: pointer.x, y: pointer.y };

      // Add the point to our points array
      const newPoints = [...points, clickPoint];
      setPoints(newPoints);

      // Add a visual marker for the point
      const marker = new fabric.Circle({
        left: clickPoint.x - 4,
        top: clickPoint.y - 4,
        radius: 4,
        fill: 'red',
        selectable: false,
        evented: false
      });

      canvas.add(marker);
      setTempMarkers([...tempMarkers, marker]);

      // If we have more than one point, draw a line from the previous point
      if (newPoints.length > 1) {
        const prevPoint = newPoints[newPoints.length - 2];
        const line = new fabric.Line(
          [prevPoint.x, prevPoint.y, clickPoint.x, clickPoint.y],
          {
            stroke: 'red',
            selectable: false,
            evented: false
          }
        );
        canvas.add(line);
        setTempLines([...tempLines, line]);
      }

      // If we have 3 or more points, show the zone type dialog
      if (newPoints.length >= 3) {
        setDrawnZonePoints([...newPoints]);
        setShowDrawnZoneDialog(true);
      }

      canvas.renderAll();
    };

    canvas.on('mouse:down', handleCanvasClick);
    
    return () => {
      canvas.off('mouse:down', handleCanvasClick);
    };
  }, [canvas, isDrawing, points]);

  const finishDrawingZone = (pointsToUse = points) => {
    setIsDrawing(false);
    setPoints([]);
    setPendingPoints(null);
    canvas.selection = true;
    canvas.defaultCursor = 'default';
    canvas.hoverCursor = 'move';
    
    // Clear temporary markers and lines
    tempMarkers.forEach(marker => canvas.remove(marker));
    tempLines.forEach(line => canvas.remove(line));
    setTempMarkers([]);
    setTempLines([]);
  };

  const addTextToZone = () => {
    if (!canvas || !selectedObject) return;
    
    const text = prompt('Enter text for the zone:');
    if (!text) return;

    const textObj = new fabric.Text(text, {
      fontSize: 24,
      fontFamily: 'Arial Black, Helvetica, sans-serif',
      fontWeight: 'bold',
      fill: '#ffffff',
      originX: 'center',
      originY: 'center',
      name: 'zone_text',
      shadow: new fabric.Shadow({
        color: 'rgba(0,0,0,0.3)',
        blur: 5,
        offsetX: 2,
        offsetY: 2
      })
    });

    // If the selected object is already a group with text, replace the text
    if (selectedObject.type === 'group' && selectedObject.getObjects().some(obj => obj.name === 'zone_text')) {
      const oldText = selectedObject.getObjects().find(obj => obj.name === 'zone_text');
      const zoneObj = selectedObject.getObjects().find(obj => obj.name?.includes('zone') && obj.name !== 'zone_text');
      selectedObject.remove(oldText);
      
      // Position text in center of zone
      const zoneBounds = zoneObj.getBoundingRect();
      textObj.set({
        left: zoneBounds.width / 2,
        top: zoneBounds.height / 2
      });
      
      selectedObject.addWithUpdate(textObj);
    } else {
      // Create new group with zone and text
      const bounds = selectedObject.getBoundingRect();
      textObj.set({
        left: bounds.width / 2,
        top: bounds.height / 2
      });
      
      const group = new fabric.Group([selectedObject], {
        name: selectedObject.name + '_group'
      });
      group.addWithUpdate(textObj);
      
      canvas.remove(selectedObject);
      canvas.add(group);
      canvas.setActiveObject(group);
    }
    
    canvas.renderAll();
  };

  const editZoneText = () => {
    if (!canvas || !selectedObject || selectedObject.type !== 'group') return;
    
    const textObj = selectedObject.getObjects().find(obj => obj.name === 'zone_text');
    const zoneObj = selectedObject.getObjects().find(obj => obj.name?.includes('zone') && obj.name !== 'zone_text');
    if (!textObj || !zoneObj) return;
    
    const newText = prompt('Edit text:', textObj.text);
    if (!newText || newText === textObj.text) return;

    // Update the existing text object instead of creating a new one
    textObj.set('text', newText);
    canvas.renderAll();
  };

  const startDrawingZone = () => {
    if (!canvas) return;
    setIsDrawing(true);
    setPoints([]);
    setPendingPoints(null);
    canvas.selection = false;
    canvas.defaultCursor = 'crosshair';
    canvas.hoverCursor = 'crosshair';
  };

  const addCustomZone = () => {
    setShowCustomZoneColorPicker(true);
    createRectangleZonePreview();
  };

  const createRectangleZonePreview = () => {
    if (!canvas) return;
    
    const zoneSize = 200;
    const canvasCenter = canvas.getCenter();
    
    const points = [
      { x: canvasCenter.left - zoneSize/2, y: canvasCenter.top - zoneSize/2 },
      { x: canvasCenter.left + zoneSize/2, y: canvasCenter.top - zoneSize/2 },
      { x: canvasCenter.left + zoneSize/2, y: canvasCenter.top + zoneSize/2 },
      { x: canvasCenter.left - zoneSize/2, y: canvasCenter.top + zoneSize/2 }
    ];

    setRectangleZonePreview(points);
  };

  const handleCustomZoneColor = (color) => {
    setCustomZoneColor(color);
  };

  const handlePlaceCustomZone = () => {
    if (!rectangleZonePreview) return;
    
    const polygon = new fabric.Polygon(rectangleZonePreview, {
      fill: `rgba(${hexToRgb(customZoneColor).r}, ${hexToRgb(customZoneColor).g}, ${hexToRgb(customZoneColor).b}, ${customZoneOpacity})`,
      stroke: '',
      strokeWidth: 0,
      selectable: true,
      hasControls: true,
      hasBorders: true,
      name: 'custom_zone',
      opacity: 1,
      evented: true
    });

    canvas.add(polygon);
    canvas.setActiveObject(polygon);
    
    // Move all measurement lines and objectives to front
    canvas.getObjects().forEach(obj => {
      if (obj.name && (
          obj.name.includes('measurement') || 
          obj.name.includes('objective') || 
          obj.name === 'center_marker')) {
        obj.bringToFront();
      }
    });

    canvas.renderAll();
    setShowCustomZoneColorPicker(false);
    setRectangleZonePreview(null);
  };

  const updateSelectedImageProperties = () => {
    if (!canvas || !selectedObject || !selectedObject.name?.includes('unit')) return;
    
    selectedObject.set({
      opacity: imageOpacity
    });
    
    canvas.renderAll();
  };

  const handleImageOpacityChange = (value) => {
    setImageOpacity(value);
    if (selectedObject && selectedObject.name?.includes('unit')) {
      selectedObject.set({ opacity: value });
      canvas.renderAll();
    }
  };

  const addObjectiveMarker = () => {
    if (!canvas) return;

    fabric.Image.fromURL(objectiveIcon, function(img) {
      img.set({
        left: CANVAS_WIDTH / 2,
        top: CANVAS_HEIGHT / 2,
        name: 'objective_marker',
        cornerColor: '#ff3b30',
        cornerStrokeColor: '#ffffff',
        cornerSize: 14,
        cornerStyle: 'circle',
        borderColor: '#ff3b30',
        transparentCorners: false,
        cornerDashArray: null,
        borderDashArray: null,
        borderScaleFactor: 2,
        padding: 10
      });

      // Scale the image
      const scaleFactor = GRID_SIZE * 2 / Math.max(img.width, img.height);
      img.scale(scaleFactor);

      canvas.add(img);
      canvas.setActiveObject(img);
      canvas.renderAll();
    });
  };

  const addStrikeForceMarker = () => {
    if (!canvas) return;
    
    fabric.Image.fromURL(strikeObjectiveIcon, (img) => {
      const scale = 0.5;
      img.set({
        left: CANVAS_WIDTH / 2,
        top: CANVAS_HEIGHT / 2,
        originX: 'center',
        originY: 'center',
        name: 'strike_force_marker',
        scaleX: scale,
        scaleY: scale
      });
      
      canvas.add(img);
      canvas.setActiveObject(img);
      canvas.renderAll();
    });
  };

  const addUnitImage = (type) => {
    if (!canvas) return;
    
    const iconSrc = type === 'attacker' ? attackerIcon : defenderIcon;
    
    fabric.loadSVGFromURL(iconSrc, function(objects, options) {
      const svg = fabric.util.groupSVGElements(objects, options);
      
      svg.set({
        left: CANVAS_WIDTH / 2,
        top: CANVAS_HEIGHT / 2,
        originX: 'center',
        originY: 'center',
        name: `${type}_unit`
      });

      canvas.add(svg);
      canvas.setActiveObject(svg);
      setSelectedObject(svg);
      setShowImageSettings(true);
      canvas.renderAll();
    });
  };

  const handleObjectSelected = (e) => {
    const obj = e.selected[0];
    setSelectedObject(obj);
    
    if (obj?.name?.includes('unit')) {
      setImageOpacity(obj.opacity);
    }
  };

  useEffect(() => {
    if (!canvas) return;
    
    canvas.on('selection:created', handleObjectSelected);
    canvas.on('selection:updated', handleObjectSelected);
    canvas.on('selection:cleared', () => setSelectedObject(null));
    
    return () => {
      canvas.off('selection:created', handleObjectSelected);
      canvas.off('selection:updated', handleObjectSelected);
      canvas.off('selection:cleared');
    };
  }, [canvas]);

  const addMeasurementLine = (isVertical = false) => {
    if (!canvas) return;

    const line = new fabric.Line(
      isVertical ? [50, 50, 50, 150] : [50, 50, 150, 50],
      {
        stroke: "#000000",
        strokeWidth: 2,
        name: 'measurement_line',
        selectable: true,
        hasControls: true,
        hasBorders: true,
        padding: 10,
        cornerSize: 8,
        cornerColor: '#000000',
        cornerStyle: 'circle',
        transparentCorners: false,
        hasRotatingPoint: false,
        lockRotation: true,
        lockScalingFlip: true,
        centeredScaling: false,
        snapAngle: 90,
        snapThreshold: 10
      }
    );

    // Create arrowheads using triangles
    const arrowSize = 10;
    const startArrow = new fabric.Triangle({
      width: arrowSize,
      height: arrowSize,
      fill: '#000000',
      left: line.get('x1'),
      top: line.get('y1'),
      angle: isVertical ? 0 : 270,
      originX: 'center',
      originY: 'center',
      selectable: false,
      name: 'measurement_arrow'
    });

    const endArrow = new fabric.Triangle({
      width: arrowSize,
      height: arrowSize,
      fill: '#000000',
      left: line.get('x2'),
      top: line.get('y2'),
      angle: isVertical ? 180 : 90,
      originX: 'center',
      originY: 'center',
      selectable: false,
      name: 'measurement_arrow'
    });

    // Create a group for the line and arrows
    const group = new fabric.Group([line, startArrow, endArrow], {
      name: 'measurement_group',
      hasControls: true,
      hasBorders: true,
      lockRotation: true,
      snapToGrid: true,
      gridSize: GRID_SIZE
    });

    // Set up controls to only allow scaling in the correct direction
    if (isVertical) {
      group.setControlsVisibility({
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
      group.setControlsVisibility({
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
      left: isVertical ? group.left + 10 : group.left + (group.width / 2),
      top: isVertical ? group.top + (group.height / 2) : group.top - 25,
      fontSize: 16,
      fontFamily: 'Arial',
      fontWeight: 'bold',
      fill: '#000000',
      backgroundColor: 'rgba(255,255,255,0.9)',
      name: 'measurement_text',
      selectable: true,
      hasControls: true,
      hasBorders: true,
      editable: true,
      padding: 5
    });

    canvas.add(group);
    canvas.add(text);
    group.bringToFront();
    text.bringToFront();
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

  const duplicateSelected = () => {
    if (!canvas) return;
    const activeObject = canvas.getActiveObject();
    if (!activeObject) return;
    
    // Clone the selected object
    activeObject.clone((clonedObj) => {
      // Offset the position slightly to make it visible
      clonedObj.set({
        left: clonedObj.left + GRID_SIZE,
        top: clonedObj.top + GRID_SIZE,
        evented: true,
      });
      
      canvas.add(clonedObj);
      canvas.setActiveObject(clonedObj);
      canvas.renderAll();
    });
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

  const handleZoneTypeSelection = (type) => {
    createZone(type);
    setShowZoneDialog(false);
  };

  const handleDrawnZoneType = (type) => {
    if (type === 'custom') {
      setShowDrawnZoneColorPicker(true);
    } else {
      finishDrawingZone(points);
      createDrawnZone(type);
      setShowDrawnZoneDialog(false);
    }
  };

  const createDrawnZone = (type, customColor = null) => {
    if (!canvas || !drawnZonePoints || drawnZonePoints.length < 3) return;

    const zoneColor = type === "attacker" ? "rgba(139, 52, 43, 0.8)" : 
                     type === "defender" ? "rgba(72, 94, 82, 0.8)" :
                     `rgba(${hexToRgb(customColor || customZoneColor).r}, ${hexToRgb(customColor || customZoneColor).g}, ${hexToRgb(customColor || customZoneColor).b}, ${customZoneOpacity})`;

    const polygon = new fabric.Polygon(drawnZonePoints, {
      fill: zoneColor,
      stroke: '',
      strokeWidth: 0,
      selectable: true,
      hasControls: true,
      hasBorders: true,
      name: `${type}_zone`,
      opacity: 1,
      evented: true
    });

    canvas.add(polygon);
    canvas.setActiveObject(polygon);
    
    // Move all measurement lines and objectives to front
    canvas.getObjects().forEach(obj => {
      if (obj.name && (
          obj.name.includes('measurement') || 
          obj.name.includes('objective') || 
          obj.name === 'center_marker')) {
        obj.bringToFront();
      }
    });

    canvas.renderAll();
    setDrawnZonePoints(null);
    setShowDrawnZoneColorPicker(false);
  };

  const handleDrawnZoneColor = (color) => {
    setCustomZoneColor(color);
  };

  const handlePlaceDrawnZone = () => {
    finishDrawingZone(points);
    createDrawnZone('custom', customZoneColor);
    setShowDrawnZoneDialog(false);
    setShowDrawnZoneColorPicker(false);
  };

  useEffect(() => {
    if (selectedObject?.name?.includes('unit')) {
      updateSelectedImageProperties();
    }
  }, [imageOpacity]);

  useEffect(() => {
    if (!canvas || !drawnZonePoints || !showDrawnZoneColorPicker) return;

    // Remove any existing preview
    const existingPreview = canvas.getObjects().find(obj => obj.name === 'zone_preview');
    if (existingPreview) {
      canvas.remove(existingPreview);
    }

    // Create preview polygon
    const previewZone = new fabric.Polygon(drawnZonePoints, {
      fill: `rgba(${hexToRgb(customZoneColor).r}, ${hexToRgb(customZoneColor).g}, ${hexToRgb(customZoneColor).b}, ${customZoneOpacity})`,
      stroke: '',
      strokeWidth: 0,
      selectable: false,
      hasControls: false,
      hasBorders: false,
      name: 'zone_preview',
      opacity: 0.5,
      evented: false
    });

    canvas.add(previewZone);
    canvas.renderAll();

    // Cleanup function
    return () => {
      const previewToRemove = canvas.getObjects().find(obj => obj.name === 'zone_preview');
      if (previewToRemove) {
        canvas.remove(previewToRemove);
        canvas.renderAll();
      }
    };
  }, [canvas, drawnZonePoints, customZoneColor, showDrawnZoneColorPicker, customZoneOpacity]);

  useEffect(() => {
    if (!canvas || !rectangleZonePreview || !showCustomZoneColorPicker) return;

    // Remove any existing preview
    const existingPreview = canvas.getObjects().find(obj => obj.name === 'rectangle_preview');
    if (existingPreview) {
      canvas.remove(existingPreview);
    }

    // Create preview polygon
    const previewZone = new fabric.Polygon(rectangleZonePreview, {
      fill: `rgba(${hexToRgb(customZoneColor).r}, ${hexToRgb(customZoneColor).g}, ${hexToRgb(customZoneColor).b}, ${customZoneOpacity})`,
      stroke: '',
      strokeWidth: 0,
      selectable: false,
      hasControls: false,
      hasBorders: false,
      name: 'rectangle_preview',
      opacity: 0.5,
      evented: false
    });

    canvas.add(previewZone);
    canvas.renderAll();

    // Cleanup function
    return () => {
      const previewToRemove = canvas.getObjects().find(obj => obj.name === 'rectangle_preview');
      if (previewToRemove) {
        canvas.remove(previewToRemove);
        canvas.renderAll();
      }
    };
  }, [canvas, rectangleZonePreview, showCustomZoneColorPicker, customZoneColor, customZoneOpacity]);

  const hexToRgb = (hex) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : null;
  };

  const createZone = (type) => {
    if (!canvas) return;
    
    const zoneSize = 200; // Default size for placed zones
    const canvasCenter = canvas.getCenter();
    
    const points = [
      { x: canvasCenter.left - zoneSize/2, y: canvasCenter.top - zoneSize/2 },
      { x: canvasCenter.left + zoneSize/2, y: canvasCenter.top - zoneSize/2 },
      { x: canvasCenter.left + zoneSize/2, y: canvasCenter.top + zoneSize/2 },
      { x: canvasCenter.left - zoneSize/2, y: canvasCenter.top + zoneSize/2 }
    ];

    const polygon = new fabric.Polygon(points, {
      fill: type === "attacker" ? "rgba(139, 52, 43, 0.8)" : 
           type === "defender" ? "rgba(72, 94, 82, 0.8)" :
           `rgba(${hexToRgb(customZoneColor).r}, ${hexToRgb(customZoneColor).g}, ${hexToRgb(customZoneColor).b}, ${customZoneOpacity})`,
      stroke: '',
      strokeWidth: 0,
      selectable: true,
      hasControls: true,
      hasBorders: true,
      name: `${type}_zone`,
      opacity: 1,
      evented: true
    });

    canvas.add(polygon);
    canvas.setActiveObject(polygon);
    
    // Move all measurement lines and objectives to front
    canvas.getObjects().forEach(obj => {
      if (obj.name && (
          obj.name.includes('measurement') || 
          obj.name.includes('objective') || 
          obj.name === 'center_marker')) {
        obj.bringToFront();
      }
    });

    canvas.renderAll();
  };

  const addDeploymentZone = (type) => {
    const width = 12 * INCH_TO_PIXEL_RATIO; // 12 inches
    const height = 6 * INCH_TO_PIXEL_RATIO; // 6 inches
    
    const rect = new fabric.Rect({
      left: CANVAS_WIDTH / 2,
      top: CANVAS_HEIGHT / 2,
      width: width,
      height: height,
      fill: type === "attacker" ? "rgba(139, 52, 43, 0.8)" : 
            type === "defender" ? "rgba(72, 94, 82, 0.8)" :
            "rgba(230, 126, 34, 0.3)", // Orange for danger zone
      stroke: '',
      strokeWidth: 0,
      originX: 'center',
      originY: 'center',
      name: `${type}_zone`
    });

    canvas.add(rect);
    canvas.setActiveObject(rect);
    canvas.renderAll();
  };

  // Add storage error handling
  const saveToLocalStorage = (key, value) => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.warn('Unable to save to local storage:', error);
    }
  };

  const loadFromLocalStorage = (key, defaultValue) => {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue;
    } catch (error) {
      console.warn('Unable to load from local storage:', error);
      return defaultValue;
    }
  };

  return (
    <div>
      <div className="button-groups-container" style={{ display: 'flex', gap: '20px', justifyContent: 'center' }}>
        <div className="button-group" style={{ width: '200px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div className="button-group-title" style={{ textAlign: 'center', padding: '5px', backgroundColor: '#2c2c2c', borderRadius: '5px' }}>Map Editor</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '5px' }}>
            <button onClick={() => addDeploymentZone("attacker")} style={{ padding: '8px', backgroundColor: '#3c3c3c', border: 'none', color: 'white', borderRadius: '5px', cursor: 'pointer', fontSize: '12px' }}>Attacker Zone</button>
            <button onClick={() => addDeploymentZone("defender")} style={{ padding: '8px', backgroundColor: '#3c3c3c', border: 'none', color: 'white', borderRadius: '5px', cursor: 'pointer', fontSize: '12px' }}>Defender Zone</button>
            <button onClick={addObjectiveMarker} style={{ padding: '8px', backgroundColor: '#3c3c3c', border: 'none', color: 'white', borderRadius: '5px', cursor: 'pointer', fontSize: '12px' }}>Objective</button>
            <button onClick={addStrikeForceMarker} style={{ padding: '8px', backgroundColor: '#3c3c3c', border: 'none', color: 'white', borderRadius: '5px', cursor: 'pointer', fontSize: '12px' }}>Strike Force</button>
            <button onClick={() => addUnitImage("attacker")} style={{ padding: '8px', backgroundColor: '#3c3c3c', border: 'none', color: 'white', borderRadius: '5px', cursor: 'pointer', fontSize: '12px' }}>Attacker Logo</button>
            <button onClick={() => addUnitImage("defender")} style={{ padding: '8px', backgroundColor: '#3c3c3c', border: 'none', color: 'white', borderRadius: '5px', cursor: 'pointer', fontSize: '12px' }}>Defender Logo</button>
          </div>
          <button onClick={addCustomZone} style={{ width: '100%', padding: '8px', backgroundColor: '#3c3c3c', border: 'none', color: 'white', borderRadius: '5px', cursor: 'pointer' }}>Add Custom Zone</button>
          <button 
            onClick={startDrawingZone} 
            style={{ 
              width: '100%', 
              padding: '8px', 
              backgroundColor: isDrawing ? '#4c4c4c' : '#3c3c3c', 
              border: 'none', 
              color: 'white', 
              borderRadius: '5px', 
              cursor: 'pointer',
              position: 'relative'
            }}
          >
            Draw Custom Zone
            {isDrawing && (
              <div style={{ 
                fontSize: '12px', 
                marginTop: '4px',
                color: '#aaa' 
              }}>
                Click to place points. Need 3+ points.
                Select color when done.
              </div>
            )}
          </button>
        </div>

        <div className="button-group" style={{ width: '200px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div className="button-group-title" style={{ textAlign: 'center', padding: '5px', backgroundColor: '#2c2c2c', borderRadius: '5px' }}>Tools</div>
          <button onClick={() => addMeasurementLine(false)} style={{ width: '100%', padding: '8px', backgroundColor: '#3c3c3c', border: 'none', color: 'white', borderRadius: '5px', cursor: 'pointer' }}>Measure Width</button>
          <button onClick={() => addMeasurementLine(true)} style={{ width: '100%', padding: '8px', backgroundColor: '#3c3c3c', border: 'none', color: 'white', borderRadius: '5px', cursor: 'pointer' }}>Measure Height</button>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '5px' }}>
            <button 
              onClick={addTextToZone}
              disabled={!selectedObject || !selectedObject.name?.includes('zone') || (selectedObject.type === 'group' && selectedObject.getObjects().some(obj => obj.name === 'zone_text'))}
              style={{ 
                padding: '8px', 
                backgroundColor: '#3c3c3c', 
                border: 'none', 
                color: 'white', 
                borderRadius: '5px', 
                cursor: (selectedObject && selectedObject.name?.includes('zone') && !(selectedObject.type === 'group' && selectedObject.getObjects().some(obj => obj.name === 'zone_text'))) ? 'pointer' : 'not-allowed',
                opacity: (selectedObject && selectedObject.name?.includes('zone') && !(selectedObject.type === 'group' && selectedObject.getObjects().some(obj => obj.name === 'zone_text'))) ? 1 : 0.5,
                fontSize: '12px'
              }}
            >
              Add Text
            </button>
            <button 
              onClick={editZoneText}
              disabled={!selectedObject || selectedObject.type !== 'group' || !selectedObject.getObjects().some(obj => obj.name === 'zone_text')}
              style={{ 
                padding: '8px', 
                backgroundColor: '#3c3c3c', 
                border: 'none', 
                color: 'white', 
                borderRadius: '5px', 
                cursor: (selectedObject && selectedObject.type === 'group' && selectedObject.getObjects().some(obj => obj.name === 'zone_text')) ? 'pointer' : 'not-allowed',
                opacity: (selectedObject && selectedObject.type === 'group' && selectedObject.getObjects().some(obj => obj.name === 'zone_text')) ? 1 : 0.5,
                fontSize: '12px'
              }}
            >
              Edit Text
            </button>
          </div>
          <div style={{ height: '1px', backgroundColor: '#444444', margin: '5px 0' }}></div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '5px' }}>
            <button onClick={groupSelected} style={{ padding: '8px', backgroundColor: '#3c3c3c', border: 'none', color: 'white', borderRadius: '5px', cursor: 'pointer', fontSize: '12px' }}>Group</button>
            <button onClick={ungroupSelected} style={{ padding: '8px', backgroundColor: '#3c3c3c', border: 'none', color: 'white', borderRadius: '5px', cursor: 'pointer', fontSize: '12px' }}>Ungroup</button>
            <button onClick={duplicateSelected} style={{ padding: '8px', backgroundColor: '#3c3c3c', border: 'none', color: 'white', borderRadius: '5px', cursor: 'pointer', fontSize: '12px' }}>Duplicate</button>
            <button onClick={deleteSelected} style={{ padding: '8px', backgroundColor: '#3c3c3c', border: 'none', color: 'white', borderRadius: '5px', cursor: 'pointer', fontSize: '12px' }}>Delete</button>
          </div>
        </div>

        <div className="button-group" style={{ width: '200px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div className="button-group-title" style={{ textAlign: 'center', padding: '5px', backgroundColor: '#2c2c2c', borderRadius: '5px' }}>Settings</div>
          <button 
            onClick={() => setShowCenterMarker(!showCenterMarker)} 
            style={{ width: '100%', padding: '8px', backgroundColor: '#3c3c3c', border: 'none', color: 'white', borderRadius: '5px', cursor: 'pointer' }}
          >
            {showCenterMarker ? 'Hide Center' : 'Show Center'}
          </button>
          <button onClick={saveMap} style={{ width: '100%', padding: '8px', backgroundColor: '#3c3c3c', border: 'none', color: 'white', borderRadius: '5px', cursor: 'pointer' }}>Save</button>
          <button onClick={loadMap} style={{ width: '100%', padding: '8px', backgroundColor: '#3c3c3c', border: 'none', color: 'white', borderRadius: '5px', cursor: 'pointer' }}>Load</button>
          <button onClick={exportAsPNG} style={{ width: '100%', padding: '8px', backgroundColor: '#3c3c3c', border: 'none', color: 'white', borderRadius: '5px', cursor: 'pointer' }}>Export</button>
        </div>

        {showImageSettings && selectedObject && selectedObject.name?.includes('unit') && (
          <div style={{
            position: 'fixed',
            top: '40%',
            right: '8px',
            transform: 'translateY(-50%)',
            backgroundColor: '#2c2c2c',
            padding: '10px',
            borderRadius: '6px',
            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.3)',
            zIndex: 1000,
            color: 'white',
            fontSize: '12px',
            width: '170px'
          }}>
            <h3 style={{ margin: '0 0 8px 0', fontSize: '13px', textAlign: 'center' }}>Logo Settings</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div>
                <label style={{ marginBottom: '4px', display: 'block', fontSize: '12px' }}>Opacity:</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <input 
                    type="range" 
                    min="0" 
                    max="1" 
                    step="0.1"
                    value={imageOpacity}
                    onChange={(e) => handleImageOpacityChange(parseFloat(e.target.value))}
                    style={{ width: '90px' }}
                  />
                  <span style={{ fontSize: '11px', minWidth: '24px' }}>{imageOpacity.toFixed(1)}</span>
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '6px', justifyContent: 'center', marginTop: '10px' }}>
              <button 
                onClick={() => setShowImageSettings(false)}
                style={{ 
                  padding: '5px 10px',
                  backgroundColor: '#2ecc71',
                  border: 'none',
                  color: 'white',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '12px'
                }}
              >
                OK
              </button>
              <button 
                onClick={() => {
                  setShowImageSettings(false);
                  // Reset to previous values
                  if (selectedObject) {
                    selectedObject.set({
                      opacity: imageOpacity
                    });
                    canvas.renderAll();
                  }
                }}
                style={{ 
                  padding: '5px 10px',
                  backgroundColor: '#e74c3c',
                  border: 'none',
                  color: 'white',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '12px'
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {showCustomZoneColorPicker && (
          <div style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            backgroundColor: '#2c2c2c',
            padding: '10px',
            borderRadius: '6px',
            boxShadow: '0 4px 6px rgba(0,0,0,0.3)',
            zIndex: 1000,
            color: 'white',
            width: '130px'
          }}>
            <div style={{ marginBottom: '10px' }}>
              <label>Select Color:</label>
              <input
                type="color"
                value={customZoneColor}
                onChange={(e) => setCustomZoneColor(e.target.value)}
                style={{ width: '100%', marginTop: '5px' }}
              />
            </div>
            <button
              onClick={handlePlaceCustomZone}
              style={{
                width: '100%',
                padding: '5px',
                backgroundColor: '#4CAF50',
                border: 'none',
                borderRadius: '4px',
                color: 'white',
                cursor: 'pointer'
              }}
            >
              Place Zone
            </button>
          </div>
        )}

        {showDrawnZoneDialog && (
          <div style={{
            position: 'fixed',
            top: '40%',
            right: '8px',
            transform: 'translateY(-50%)',
            backgroundColor: '#2c2c2c',
            padding: '10px',
            borderRadius: '6px',
            boxShadow: '0 4px 6px rgba(0,0,0,0.3)',
            zIndex: 1000,
            color: 'white',
            width: '130px'
          }}>
            {!showDrawnZoneColorPicker ? (
              <>
                <h3 style={{ margin: '0 0 8px 0', fontSize: '13px', textAlign: 'center' }}>Zone Type</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                  <button onClick={() => handleDrawnZoneType("attacker")} 
                    style={{ padding: '5px', backgroundColor: '#e74c3c', border: 'none', color: 'white', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}>
                    Attacker
                  </button>
                  <button onClick={() => handleDrawnZoneType("defender")} 
                    style={{ padding: '5px', backgroundColor: '#1abc9c', border: 'none', color: 'white', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}>
                    Defender
                  </button>
                  <button onClick={() => handleDrawnZoneType("custom")} 
                    style={{ padding: '5px', backgroundColor: '#3c3c3c', border: 'none', color: 'white', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}>
                    Custom
                  </button>
                  <button 
                    onClick={() => {
                      setShowDrawnZoneDialog(false);
                      setDrawnZonePoints(null);
                    }}
                    style={{ padding: '5px', backgroundColor: '#7f8c8d', border: 'none', color: 'white', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}>
                    Cancel
                  </button>
                </div>
              </>
            ) : (
              <>
                <h3 style={{ margin: '0 0 8px 0', fontSize: '13px', textAlign: 'center' }}>Custom Zone Color</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                  <input 
                    type="color" 
                    value={customZoneColor}
                    onChange={(e) => handleDrawnZoneColor(e.target.value)}
                    style={{ width: '100%', height: '30px' }}
                  />
                  <input 
                    type="range" 
                    min="0" 
                    max="1" 
                    step="0.1"
                    value={customZoneOpacity}
                    onChange={(e) => setCustomZoneOpacity(parseFloat(e.target.value))}
                    style={{ width: '100%' }}
                  />
                  <span style={{ fontSize: '12px', textAlign: 'center' }}>Opacity: {customZoneOpacity}</span>
                  <button 
                    onClick={handlePlaceDrawnZone}
                    style={{ 
                      padding: '5px', 
                      backgroundColor: '#27ae60', 
                      border: 'none', 
                      color: 'white', 
                      borderRadius: '4px', 
                      cursor: 'pointer', 
                      fontSize: '12px',
                      marginTop: '5px'
                    }}
                  >
                    Place Zone
                  </button>
                  <button 
                    onClick={() => {
                      setShowDrawnZoneColorPicker(false);
                      setShowDrawnZoneDialog(false);
                      setDrawnZonePoints(null);
                    }}
                    style={{ 
                      padding: '5px', 
                      backgroundColor: '#7f8c8d', 
                      border: 'none', 
                      color: 'white', 
                      borderRadius: '4px', 
                      cursor: 'pointer', 
                      fontSize: '12px' 
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      <div className="canvas-container" style={{ 
        position: 'relative', 
        padding: '35px 0 0 35px',
        backgroundColor: '#1E1E1E'  
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
              backgroundColor: '#d9d8d1'  
            }} 
          />
        </div>

        {isDrawing && (
          <div className="drawing-tooltip">
            Drawing mode: Click to place points. Need 3+ points.
          </div>
        )}
      </div>
    </div>
  );
};

export default MissionMapBuilder;
