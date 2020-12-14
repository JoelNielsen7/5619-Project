/* CSCI 5619 Lecture 20, Fall 2020
 * Author: Evan Suma Rosenberg
 * License: Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International
 */ 

import { Engine } from "@babylonjs/core/Engines/engine";
import { Scene } from "@babylonjs/core/scene";
import { Vector3, Color3, Color4, Vector2 } from "@babylonjs/core/Maths/math";
import { UniversalCamera } from "@babylonjs/core/Cameras/universalCamera";
import { Logger } from "@babylonjs/core/Misc/logger";
import { WebXRInputSource } from "@babylonjs/core/XR/webXRInputSource";
import { WebXRCamera } from "@babylonjs/core/XR/webXRCamera";
import { PointLight } from "@babylonjs/core/Lights/pointLight";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { Mesh } from "@babylonjs/core/Meshes/mesh";
import { AdvancedDynamicTexture } from "@babylonjs/gui/2D/advancedDynamicTexture"
import { VirtualKeyboard } from "@babylonjs/gui/2D/controls/virtualKeyboard" 
import { InputText } from "@babylonjs/gui/2D/controls/inputText" 
import { TextBlock } from "@babylonjs/gui/2D/controls/textBlock"
import { RadioButton } from "@babylonjs/gui/2D/controls/radioButton"
import { StackPanel } from "@babylonjs/gui/2D/controls/stackPanel"
import { Control } from "@babylonjs/gui/2D/controls/control"
import { Slider } from "@babylonjs/gui/2D/controls/sliders/slider"
import { SceneLoader } from "@babylonjs/core/Loading/sceneLoader"
import { AbstractMesh } from "@babylonjs/core/Meshes/abstractMesh";
import { Axis } from "@babylonjs/core/Maths/math.axis"
import { Ray } from "@babylonjs/core/Culling/ray";
import { GUI3DManager } from "@babylonjs/gui/3D/gui3DManager"
import { CylinderPanel } from "@babylonjs/gui/3D/controls/cylinderPanel"
import { HolographicButton } from "@babylonjs/gui/3D/controls/holographicButton"
import { Quaternion } from "@babylonjs/core/Maths/math.vector";
import { Button } from "@babylonjs/gui/2D/controls/button"
import { Button3D } from "@babylonjs/gui/3D/controls/button3D"
import { StackPanel3D } from "@babylonjs/gui/3D/controls/stackPanel3D"
import { WebXRControllerComponent } from "@babylonjs/core/XR/motionController/webXRControllerComponent";
import { Rectangle } from "@babylonjs/gui/2D/controls/rectangle"

// Side effects
import "@babylonjs/core/Helpers/sceneHelpers";
import "@babylonjs/inspector";

enum Mode 
{
    playground,
    kinematics,
}

class RotationElement
{
    public transformNode: TransformNode | null;
    public name: string;
    public degreeLow: number;
    public degreeHigh: number
    public axis: Axis;
    

    constructor(name: string, degreeLow: number, degreeHigh: number, axis: Axis)
    {
        this.name = name;
        this.degreeLow = degreeLow;
        this.degreeHigh = degreeHigh;
        this.transformNode = null;
        this.axis = axis
    }

    public checkBounds(proposedRotation: number)
    {
        var angles = this.transformNode!.rotationQuaternion!.toEulerAngles();
        var value = 0;
        switch (this.axis)
        {
            case Axis.X: {
                value =  angles.x * (180 / Math.PI)
            }
            case Axis.Y: {
                value = angles.y * (180 / Math.PI)
            }
            case Axis.Z: {
                value = angles.z * (180 / Math.PI)
            }
        }

        console.log("Rotation values:", value, this.degreeLow, this.degreeHigh, proposedRotation);

        if (value + proposedRotation > this.degreeHigh && proposedRotation > 0)
        {
            return 0;
        }
        else if (value + proposedRotation < this.degreeLow && proposedRotation < 0)
        {
            return 0;
        }
        else
        {
            return proposedRotation;
        }
    }
}

class TranslationElement
{
    public transformNode: TransformNode | null;
    public name: string;
    public low: number;
    public high: number
    public axis: Axis;

    constructor(name: string, low: number, high: number, axis: Axis)
    {
        this.name = name;
        this.low = low;
        this.high = high;
        this.transformNode = null;
        this.axis = axis
    }
}



class Game 
{ 
    private canvas: HTMLCanvasElement;
    private engine: Engine;
    private scene: Scene;

    private xrCamera: WebXRCamera | null; 
    private leftController: WebXRInputSource | null;
    private rightController: WebXRInputSource | null;

    private configurableMesh: Mesh | null;

    private fiveProbeMeshes: AbstractMesh[];

    private mode: Mode;

    private sliderPanel: StackPanel | null;

    private columnPanel: StackPanel | null;

    private slider: Slider | null;

    private selectableObjects: AbstractMesh[];

    private rotationObjects: RotationElement[];

    private translationObjects: TranslationElement[];

    private selectedComponent: RotationElement | TranslationElement | null;

    private buttonPanel: CylinderPanel | null;

    private trajectory: AbstractMesh | null;

    private controllerModeButton: Button | null;

    private controllerMode: boolean;

    private degreeMesh: Mesh | null;
    private degreeLabel: TextBlock | null;

    constructor()
    {
        // Get the canvas element 
        this.canvas = document.getElementById("renderCanvas") as HTMLCanvasElement;

        // Generate the BABYLON 3D engine
        this.engine = new Engine(this.canvas, true); 

        // Creates a basic Babylon Scene object
        this.scene = new Scene(this.engine);   

        this.xrCamera = null;
        this.leftController = null;
        this.rightController = null;

        this.configurableMesh = null;

        this.fiveProbeMeshes = [];

        this.mode = Mode.playground

        this.sliderPanel = null;
        this.columnPanel = null;
        this.slider = null;

        this.selectableObjects = [];

        this.rotationObjects = [];
        this.translationObjects = [];

        this.selectedComponent = null;

        this.buttonPanel = null;
        
        this.trajectory = null;

        this.controllerModeButton = null;

        this.controllerMode = false;

        this.degreeLabel = null;
        this.degreeMesh = null;
    }

    start() : void 
    {
        // Create the scene and then execute this function afterwards
        this.createScene().then(() => {

            // Register a render loop to repeatedly render the scene
            this.engine.runRenderLoop(() => { 
                this.update();
                this.scene.render();
            });

            // Watch for browser/canvas resize events
            window.addEventListener("resize", () => { 
                this.engine.resize();
            });
        });
    }

    private async createScene() 
    {
        // support arm rotates
        // standUpper translates up and down
        // 
        this.rotationObjects.push(new RotationElement("needle", -51, 51, Axis.Z))
        this.rotationObjects.push(new RotationElement("supportArm", 90, 180, Axis.X))
        this.translationObjects.push(new TranslationElement("gimbal", -100, 100, Axis.X))
        this.translationObjects.push(new TranslationElement("standLowerLeft", -60, 60, Axis.Y))
        this.translationObjects.push(new TranslationElement("standLowerRight", -60, 60, Axis.Y))
        this.translationObjects.push(new TranslationElement("standUpperLeft", -10, 10, Axis.Z))
        this.translationObjects.push(new TranslationElement("standUpperRight", -10, 10, Axis.Z))
        // This creates and positions a first-person camera (non-mesh)
        var camera = new UniversalCamera("camera1", new Vector3(0, 1.6, 0), this.scene);
        camera.fov = 90 * Math.PI / 180;
        camera.minZ = .1;
        camera.maxZ = 100;

        // This attaches the camera to the canvas
        camera.attachControl(this.canvas, true);

       // Create a point light
       var pointLight = new PointLight("pointLight", new Vector3(0, 2.5, 0), this.scene);
       pointLight.intensity = 1.0;
       pointLight.diffuse = new Color3(.25, .25, .25);

        // Creates a default skybox
        const environment = this.scene.createDefaultEnvironment({
            createGround: true,
            groundSize: 100,
            createSkybox: false
            // skyboxSize: 50,
            // skyboxColor: new Color3(0, 0, 0)
        });

        // Make sure the ground and skybox are not pickable!
        environment!.ground!.isPickable = false;
        environment!.ground!.visibility = 0;
        // environment!.skybox!.isPickable = false;

        // Creates the XR experience helper
        const xrHelper = await this.scene.createDefaultXRExperienceAsync({});

        // Assigns the web XR camera to a member variable
        this.xrCamera = xrHelper.baseExperience.camera;

        // Remove default teleportation
        xrHelper.teleportation.dispose();

        // Assign the left and right controllers to member variables
        xrHelper.input.onControllerAddedObservable.add((inputSource) => {
            if(inputSource.uniqueId.endsWith("right"))
            {
                this.rightController = inputSource;
            }
            else 
            {
                this.leftController = inputSource;
            }  
        });

        // Don't forget to deparent objects from the controllers or they will be destroyed!
        xrHelper.input.onControllerRemovedObservable.add((inputSource) => {

            if(inputSource.uniqueId.endsWith("right")) 
            {

            }
        });


        // SceneLoader.ImportMesh("", "assets/models/", "FiveProbeMachine.glb", this.scene, (meshes) => {
        //     meshes[0].name = "fiveProbe"
        //     meshes[0].position = new Vector3(5, 3, 5);
        //     meshes[0].scaling = new Vector3(0.05, 0.05, 0.05);
        //     // meshes[0].scaling = new Vector3(100, 100, 100);
        //     meshes.forEach((mesh) => {
        //         console.log("loaded ", mesh.name);
        //         this.fiveProbeMeshes.push(mesh)
        //     })
        // });

        SceneLoader.ImportMesh("", "assets/models/", "MachineModel.glb", this.scene, (meshes) => {
            meshes[0].name = "machineModel"
            var lowerStandTransform = new TransformNode("lowerStand");
            var upperStandTransform = new TransformNode("upperStand");
            lowerStandTransform.setParent(meshes[0])
            upperStandTransform.setParent(meshes[0])
            meshes[0].position = new Vector3(3, 0.5, 1.5);
            meshes[0].scaling = new Vector3(0.01, 0.01, 0.01);
            meshes[0].rotation = new Vector3(-Math.PI / 2, 0, 0)
            meshes.forEach((mesh) => {
                console.log("loaded ", mesh.name);
                this.fiveProbeMeshes.push(mesh)
                mesh.isPickable = false;

                if (mesh.name == "trajectory")
                {
                    this.trajectory = mesh;
                }

                for (let rot of this.rotationObjects)
                {
                    if (mesh.parent?.name == rot.name)
                    {
                        mesh.isPickable = true;
                        if (rot.transformNode == null)
                        {
                            console.log("got rot:", rot.name);
                            rot.transformNode = mesh.parent! as TransformNode;
                            break;
                        }
                    }
                }

                for (let tra of this.translationObjects)
                {
                    if (mesh.parent?.name == tra.name)
                    {
                        mesh.isPickable = true;
                        if (mesh.parent?.name == "standLowerLeft" || mesh.parent?.name == "standLowerRight")
                        {
                            tra.transformNode! = lowerStandTransform;
                            var parent = mesh.parent as TransformNode;
                            parent.setParent(lowerStandTransform);
                        }
                        else if (mesh.parent?.name == "standUpperLeft" || mesh.parent?.name == "standUpperRight")
                        {
                            tra.transformNode! = upperStandTransform;
                            var parent = mesh.parent as TransformNode;
                            parent.setParent(upperStandTransform);
                        }
                        else if (tra.transformNode == null)
                        {
                            console.log("got translate:", tra.name);
                            tra.transformNode = mesh.parent! as TransformNode;
                            break;
                        }
                    }
                }
            })
            this.constructHierarchy()
        });

        SceneLoader.ImportMesh("", "assets/models/", "Head.glb", this.scene, (meshes) => {
            meshes[0].name = "head"
            meshes[0].position = new Vector3(3, 0.5, 1.5);
            meshes[0].scaling = new Vector3(0.01, 0.01, 0.01);
            meshes[0].rotation = new Vector3(0, 0, Math.PI)
            meshes.forEach((mesh) => {
                console.log("loaded ", mesh.name, mesh.parent?.id);
                this.fiveProbeMeshes.push(mesh)

                
            })
            
        });




        // // Create a parent transform
        // var textTransform = new TransformNode("textTransform");
        // textTransform.rotation.y = 270 * Math.PI / 180;

        // // Create a plane for a text block
        // var staticTextPlane = MeshBuilder.CreatePlane("textPlane", {width: 10, height: 5}, this.scene);
        // staticTextPlane.position = new Vector3(0, 7, 8);
        // staticTextPlane.isPickable = false;
        // staticTextPlane.parent = textTransform;

        // // Create a dynamic texture for the text block
        // var staticTextTexture = AdvancedDynamicTexture.CreateForMesh(staticTextPlane, 1000, 500);
        // staticTextTexture.background = "#414163";

        // // Create a static text block
        // var staticText = new TextBlock();
        // staticText.text = "";
        // staticText.color = "white";
        // staticText.fontSize = 32;
        // staticText.textHorizontalAlignment = TextBlock.HORIZONTAL_ALIGNMENT_LEFT;
        // staticText.textVerticalAlignment = TextBlock.VERTICAL_ALIGNMENT_TOP;
        // staticTextTexture.addControl(staticText);

        // // Create a plane for a virtual keyboard
        // var keyboardPlane = MeshBuilder.CreatePlane("keyboardPlane", {}, this.scene);
        // keyboardPlane.position = new Vector3(0, 1.6, 1);
        // keyboardPlane.parent = textTransform;

        // // Create a dynamic texture for the virtual keyboard
        // var keyboardTexture = AdvancedDynamicTexture.CreateForMesh(keyboardPlane, 1024, 1024);

        // // Create a keyboard input text field
        // var keyboardInput = new InputText(); 
        // keyboardInput.top = -260;
        // keyboardInput.width = 1;
        // keyboardInput.height = "80px";
        // keyboardInput.fontSize = 36;
        // keyboardInput.color = "white";
        // keyboardInput.background = "#070707";    
		// keyboardTexture.addControl(keyboardInput);

        // // Create a virtual keyboard
        // var virtualKeyboard = VirtualKeyboard.CreateDefaultLayout("virtualKeyboard");
        // virtualKeyboard.scaleX = 2.0;
        // virtualKeyboard.scaleY = 2.0;
        // keyboardTexture.addControl(virtualKeyboard);

        // // This connects automatically hides the keyboard
        // //virtualKeyboard.connect(keyboardInput);

        // // This keeps the keyboard visible
        // virtualKeyboard.onKeyPressObservable.add((key) => {
        //     switch(key)
        //     {
        //         // Backspace
        //         case '\u2190':
        //             keyboardInput.processKey(8);
        //             break;

        //         // Shift
        //         case '\u21E7':
        //             virtualKeyboard.shiftState = virtualKeyboard.shiftState == 0 ? 1 : 0;
        //             virtualKeyboard.applyShiftState(virtualKeyboard.shiftState);
        //             break;

        //         // Enter
        //         case '\u21B5':
        //             keyboardInput.processKey(13);
        //             staticText.text += "\n> " + keyboardInput.text;
        //             break;  
                
        //         default:
        //             keyboardInput.processKey(-1, virtualKeyboard.shiftState == 0 ? key : key.toUpperCase());
        //     }
        // });

        // Create a parent transform for the object configuration panel
        var configTransform = new TransformNode("textTransform");

        // Create a plane for the object configuration panel
        var configPlane = MeshBuilder.CreatePlane("configPlane", {width: 1.5, height: .5}, this.scene);
        configPlane.position = new Vector3(0, 1, 1);
        configPlane.parent = configTransform;

        // Create a dynamic texture the object configuration panel
        var configTexture = AdvancedDynamicTexture.CreateForMesh(configPlane, 1500, 500);
        configTexture.background = (new Color4(.5, .5, .5, .25)).toHexString();

        // Create a stack panel for the columns
        var columnPanel = new StackPanel();
        columnPanel.isVertical = false;
        columnPanel.widthInPixels = 1400;
        columnPanel.horizontalAlignment = StackPanel.HORIZONTAL_ALIGNMENT_LEFT;
        columnPanel.paddingLeftInPixels = 50;
        columnPanel.paddingTopInPixels = 50;
        configTexture.addControl(columnPanel);

        // Create a stack panel for the radio buttons
        var radioButtonPanel = new StackPanel();
        radioButtonPanel.widthInPixels = 500;
        radioButtonPanel.isVertical = true;
        radioButtonPanel.verticalAlignment = StackPanel.VERTICAL_ALIGNMENT_TOP;
        columnPanel.addControl(radioButtonPanel);

        // Create radio buttons for changing the object type
        var radioButton1 = new RadioButton("radioButton1");
        radioButton1.width = "50px";
        radioButton1.height = "50px";
        radioButton1.color = "lightblue";
        radioButton1.background = "black";
        
        var radioButton2 = new RadioButton("radioButton1");
        radioButton2.width = "50px";
        radioButton2.height = "50px";
        radioButton2.color = "lightblue";
        radioButton2.background = "black";

        // Text headers for the radio buttons
        var radioButton1Header = Control.AddHeader(radioButton1, "Playground", "500px", {isHorizontal: true, controlFirst: true});
        radioButton1Header.horizontalAlignment = StackPanel.HORIZONTAL_ALIGNMENT_LEFT;
        radioButton1Header.height = "75px";
        radioButton1Header.fontSize = "48px";
        radioButton1Header.color = "white";
        radioButtonPanel.addControl(radioButton1Header);

        var radioButton2Header = Control.AddHeader(radioButton2, "Inverse Kinematics", "500px", {isHorizontal: true, controlFirst: true});
        radioButton2Header.horizontalAlignment = StackPanel.HORIZONTAL_ALIGNMENT_LEFT;
        radioButton2Header.height = "75px";
        radioButton2Header.fontSize = "48px";
        radioButton2Header.color = "white";
        radioButtonPanel.addControl(radioButton2Header);

        // Create a transform node to hold the configurable mesh
        var configurableMeshTransform = new TransformNode("configurableMeshTransform", this.scene);
        configurableMeshTransform.position = new Vector3(0, 1, 4);

        // Event handlers for the radio buttons
        radioButton1.onIsCheckedChangedObservable.add((state) => {
            if(state)
            {
                this.mode = Mode.playground;
                this.columnPanel!.addControl(this.sliderPanel)
            }
        });   

        radioButton2.onIsCheckedChangedObservable.add( (state) => {
            if(state)
            {
                this.mode = Mode.kinematics;
                // this.sliderPanel?.clearControls();
                this.columnPanel!.removeControl(this.sliderPanel!);
            }
        }); 

        // Create a stack panel for the radio buttons
        var sliderPanel = new StackPanel();
        sliderPanel.widthInPixels = 800;
        sliderPanel.heightInPixels = 120;
        sliderPanel.isVertical = true;
        sliderPanel.verticalAlignment = StackPanel.VERTICAL_ALIGNMENT_TOP;
        sliderPanel.horizontalAlignment = StackPanel.HORIZONTAL_ALIGNMENT_CENTER;
        sliderPanel.name = "sliderPanel";
        columnPanel.addControl(sliderPanel);
        this.sliderPanel = sliderPanel;


        // Create sliders for the x, y, and z rotation
        var xSlider = new Slider();
        xSlider.minimum = 0;
        xSlider.maximum = 360;
        xSlider.value = 0;
        xSlider.color = "lightblue";
        xSlider.height = "60px";
        xSlider.width = "500px";
        xSlider.horizontalAlignment = StackPanel.HORIZONTAL_ALIGNMENT_CENTER;
        xSlider.verticalAlignment = StackPanel.VERTICAL_ALIGNMENT_TOP;
        xSlider.barOffset = "10px";
        xSlider.top = "60px";
        xSlider.name = "xSlider";
        // xSlider.paddingTop

        

        // var ySlider = new Slider();
        // ySlider.minimum = 0;
        // ySlider.maximum = 360;
        // ySlider.value = 0;
        // ySlider.color = "lightblue";
        // ySlider.height = "50px";
        // ySlider.width = "500px";

        // var zSlider = new Slider();
        // zSlider.minimum = 0;
        // zSlider.maximum = 360;
        // zSlider.value = 0;
        // zSlider.color = "lightblue";
        // zSlider.height = "50px";
        // zSlider.width = "500px";

        // Create text headers for the sliders
        var xSliderHeader = new TextBlock("sliderHeader", "xxxxxxxxxxx"); /*Control.AddHeader(xSlider, "xxxxxxxxxxxxx", "400px", { isHorizontal: true, controlFirst: false });*/
        xSliderHeader.horizontalAlignment = StackPanel.HORIZONTAL_ALIGNMENT_CENTER;
        xSliderHeader.height = "60px";
        xSliderHeader.fontSize = "48px";
        xSliderHeader.color = "white";
        xSliderHeader.verticalAlignment = StackPanel.VERTICAL_ALIGNMENT_TOP;
        xSliderHeader.left = "0px";
        xSliderHeader.textHorizontalAlignment = StackPanel.HORIZONTAL_ALIGNMENT_CENTER;
        xSliderHeader.textVerticalAlignment = StackPanel.VERTICAL_ALIGNMENT_CENTER;

        sliderPanel.addControl(xSliderHeader);
        sliderPanel.addControl(xSlider);


        // var ySliderHeader = Control.AddHeader(ySlider, "y", "50px", {isHorizontal: true, controlFirst: false});
        // ySliderHeader.horizontalAlignment = StackPanel.HORIZONTAL_ALIGNMENT_LEFT;
        // ySliderHeader.height = "75px";
        // ySliderHeader.fontSize = "48px";
        // ySliderHeader.color = "white";
        // sliderPanel.addControl(ySliderHeader);

        // var zSliderHeader = Control.AddHeader(zSlider, "z", "50px", {isHorizontal: true, controlFirst: false});
        // zSliderHeader.horizontalAlignment = StackPanel.HORIZONTAL_ALIGNMENT_LEFT;
        // zSliderHeader.height = "75px";
        // zSliderHeader.fontSize = "48px";
        // zSliderHeader.color = "white";
        // sliderPanel.addControl(zSliderHeader);

        // Event handlers for the sliders
        xSlider.onValueChangedObservable.add((value) => {
            // configurableMeshTransform.rotation.x = value * Math.PI / 180;
            console.log("Slider changed to:", value)
            if (this.selectedComponent)
            {
                if (this.selectedComponent instanceof TranslationElement)
                {
                    switch (this.selectedComponent.axis)
                    {
                        case Axis.X: {
                            this.selectedComponent.transformNode!.position.x = value;
                            break;
                        }
                        case Axis.Y: {
                            this.selectedComponent.transformNode!.position.y = value;
                            break;
                        }
                        case Axis.Z: {
                            this.selectedComponent.transformNode!.position.z = value;
                            break;
                        }


                    }
                }
                else 
                {
                    var currentRotation = this.selectedComponent.transformNode!.rotationQuaternion!.toEulerAngles();
                    console.log("Rotating:", value, currentRotation);
                    switch (this.selectedComponent.axis)
                    {
                        case Axis.X: {
                            if (this.selectedComponent.name == "supportArm")
                            {
                                var rotationQuaternion = Quaternion.FromEulerAngles(value * (Math.PI / 180), Math.PI, 0);
                                this.selectedComponent.transformNode!.rotationQuaternion = rotationQuaternion;

                            }
                            else 
                            {
                                var rotationQuaternion = Quaternion.FromEulerAngles(value  * (Math.PI / 180), currentRotation.y, currentRotation.z);
                                this.selectedComponent.transformNode!.rotationQuaternion = rotationQuaternion// * Math.PI / 2;
                                // this.selectedComponent.transformNode!.rotation.x = value * (Math.PI / 180);
                            }
                            break;
                        }
                        case Axis.Y: {
                            var rotationQuaternion = Quaternion.FromEulerAngles(currentRotation.x, value  * (Math.PI / 180), currentRotation.z);
                            this.selectedComponent.transformNode!.rotationQuaternion = rotationQuaternion// * Math.PI / 2;
                            break;
                        }
                        case Axis.Z: {
                            var rotationQuaternion = Quaternion.FromEulerAngles(currentRotation.x, currentRotation.y, value * (Math.PI / 180));
                            this.selectedComponent.transformNode!.rotationQuaternion = rotationQuaternion// * Math.PI / 2;
                            break;
                        }
                    }
                }
            }
        });

        var plane = Mesh.CreatePlane("plane", 2, this.scene);
        plane.parent = null;
        plane.position.y = 6;
        plane.position.z = 1;
        plane.visibility = 0;
        this.degreeMesh = plane;
        

        var advancedTexture = AdvancedDynamicTexture.CreateForMesh(plane);

        var rect1 = new Rectangle();
        rect1.width = 1;
        rect1.height = 1; // "40px"
        rect1.cornerRadius = 20;
        rect1.color = "Black";
        rect1.thickness = 1;
        // rect1.background = "null";
        rect1.alpha = 0.5;
        advancedTexture.addControl(rect1);

        var label = new TextBlock();
        label.scaleX = 5;
        label.scaleY = 5;
        label.text = "Sphere";
        label.resizeToFit = true;
        this.degreeLabel = label;
        rect1.addControl(label);

        rect1.linkWithMesh(plane);   
        rect1.linkOffsetY = 0;


        // ySlider.onValueChangedObservable.add((value) => {
        //     configurableMeshTransform.rotation.y = value * Math.PI / 180;
        // });

        // zSlider.onValueChangedObservable.add((value) => {
        //     configurableMeshTransform.rotation.z = value * Math.PI / 180;
        // });

        // var button = new Button("Controller Mode");
        // // var button = Button.CreateSimpleButton("controllerMode", "Controller Mode");
        // var buttonPanel = new StackPanel();
        // // var button = new HolographicButton("orientation");
        // buttonPanel.horizontalAlignment = StackPanel.HORIZONTAL_ALIGNMENT_CENTER;
        // buttonPanel.verticalAlignment = StackPanel.VERTICAL_ALIGNMENT_BOTTOM;
        // buttonPanel.addControl(button);
        // buttonPanel.widthInPixels = 400;
        // buttonPanel.isVertical = true;

        // buttonPanel.addControl(button);
        // configTexture.addControl(buttonPanel)
        var manager = new GUI3DManager(this.scene);
        // var anchor = new TransformNode("anchor", this.scene);
        // anchor.scaling = new Vector3(0.1, 0.1, 0.1);

        // var buttonPanel = new StackPanel3D();
        // buttonPanel.margin = 0.02;
        // buttonPanel.scaling = new Vector3(0.1, 0.1, 0.1);
  
        // manager.addControl(buttonPanel);
        // buttonPanel.position.z = 1;
        // buttonPanel.position.x = 0.25
        // // var button = new HolographicButton("orientation");
        // // buttonPanel.horizontalAlignment = StackPanel.HORIZONTAL_ALIGNMENT_CENTER;
        // // buttonPanel.verticalAlignment = StackPanel.VERTICAL_ALIGNMENT_BOTTOM;
        // // buttonPanel.widthInPixels = 400;
        // // buttonPanel.isVertical = true;

        // var button = new Button3D("controllerMode");
        // button.scaling = new Vector3(0.1, 0.1, 0.1);
        // button.linkToTransformNode(anchor);
        
        // button.onPointerUpObservable.add(function(){
        //     console.log("controller button pushed")
        // });   
        
        // var text1 = new TextBlock();
        // text1.text = "Controller Mode";
        // text1.color = "white";
        // text1.fontSize = 24;
        // button.content = text1;  

        // buttonPanel.addControl(button);


        var anchor = new TransformNode("componentSelect");
        anchor.position = new Vector3(0, 1.2, 1);
            // Create the 3D UI manager
        

        var panel = new CylinderPanel();
        panel.margin = 0.2;

        manager.addControl(panel);
        panel.linkToTransformNode(anchor);
        panel.blockLayout = true;
        this.buttonPanel = panel;

        for (let rot of this.rotationObjects)
        {
            this.addButton(rot);
        }
        for (let tra of this.translationObjects)
        {
            this.addButton(tra);
        }
        panel.blockLayout = false;

        this.slider = xSlider;
        this.columnPanel = columnPanel;
        this.scene.debugLayer.show(); 
    }


    private constructHierarchy()
    {
        var needle: RotationElement;
        var supportArm: RotationElement;
        var standLowerLeft: TranslationElement;
        var standLowerRight: TranslationElement;
        var standUpperRight : TranslationElement;
        var standUpperLeft: TranslationElement;
        var gimbal: TranslationElement;

        for (let rot of this.rotationObjects)
        {
            switch(rot.name)
            {
                case "needle": {
                    needle = rot;
                }
                case "supportArm": {
                    supportArm = rot;
                }
                    
            }
        }

        for (let tra of this.translationObjects)
        {
            switch(tra.name)
            {
                case "gimbal": {
                    gimbal = tra;
                    break;
                }
                case "standLowerLeft": {
                    standLowerLeft = tra;
                    break;
                }
                case "standLowerRight": {
                    standLowerRight = tra;
                    break;
                }
                case "standUpperLeft": {
                    standUpperLeft = tra;
                    break;
                }
                case "standUpperRight": {
                    standUpperRight = tra;
                    break;
                }
                    
            }
        }

        this.trajectory!.setParent(needle!.transformNode!);
        needle!.transformNode!.setParent(gimbal!.transformNode!);
        gimbal!.transformNode!.setParent(supportArm!.transformNode!);
        supportArm!.transformNode!.setParent(standUpperLeft!.transformNode!);
        standUpperLeft!.transformNode!.setParent(standLowerLeft!.transformNode!);
        // standLowerLeft!.transformNode!.setParent()
    }


    private addButton(component: TranslationElement | RotationElement) {
        var button = new HolographicButton("orientation");
        console.log(button.behaviors);
        this.buttonPanel!.addControl(button);

        // var func = this.objectSelected;

        button.text = component.name;
        button.onPointerClickObservable.add((value) => {
            console.log("BUTTON:", value);
            // component.transformNode?.getChildMeshes().forEach((mesh) => {
            //     // mesh.enableEdgesRendering();
            // });
            this.objectSelected(component);
            // func(component);

        });
        
    }

    private objectSelected(component: RotationElement | TranslationElement) 
    {
        console.log("IN OBJECT SELECTED")
        if (this.selectedComponent)
        {
            this.selectedComponent.transformNode!.getChildMeshes().forEach((mesh) => {
                mesh.disableEdgesRendering();
            })
        }

        this.selectedComponent = component;
        // this.degreeMesh!.parent = component.transformNode!;
        this.degreeMesh!.position = new Vector3(0, 300, 0);
        // this.degreeMesh!.visibility = 1;
        this.degreeMesh!.scaling = new Vector3(100, 100, 100);
        this.degreeLabel!.text = component.name + component.transformNode!.rotation.z;
        this.selectedComponent.transformNode!.getChildMeshes().forEach((mesh) => {
            mesh.enableEdgesRendering();
        })
        this.configureSlider(component);
    }

    private configureSlider(component: RotationElement | TranslationElement)
    {
        this.sliderPanel!.clearControls();
        if ((component instanceof TranslationElement))
        {
            console.log("TRANSLATION SELECTED:", component.name)
            component = component as TranslationElement
            this.slider!.minimum = component.low;
            this.slider!.maximum = component.high;
            switch (component.axis)
            {
                case Axis.X: {
                    this.slider!.value = component.transformNode!.position.x;
                    break;
                }
                case Axis.Y: {
                    this.slider!.value = component.transformNode!.position.y;
                    break;
                }
                case Axis.Z: {
                    this.slider!.value = component.transformNode!.position.z;
                    break;
                }
            }
        }
        else
        {
            component = component as RotationElement
            this.slider!.minimum = component.degreeLow;
            this.slider!.maximum = component.degreeHigh;
            var currentQuaternion = component.transformNode!.rotationQuaternion!.toEulerAngles();
            console.log("CURRENT QUAT:", currentQuaternion)
            switch (component.axis)
            {
                case Axis.X: {
                    this.slider!.value = currentQuaternion.x * (180 / Math.PI);
                    break;
                }
                case Axis.Y: {
                    this.slider!.value = currentQuaternion.y * (180 / Math.PI);
                    break;
                }
                case Axis.Z: {
                    this.slider!.value = currentQuaternion.z * (180 / Math.PI);
                    break;
                }
            }
        }
        var xSliderHeader = new TextBlock("xSliderHeader", component.name); // Control.AddHeader(this.slider!, component.name, "400px", {isHorizontal: true, controlFirst: false});
        xSliderHeader.horizontalAlignment = StackPanel.HORIZONTAL_ALIGNMENT_CENTER;
        xSliderHeader.height = "60px";
        xSliderHeader.fontSize = "48px";
        xSliderHeader.color = "white";
        xSliderHeader.verticalAlignment = StackPanel.VERTICAL_ALIGNMENT_TOP;
        xSliderHeader.left = "0px";
        xSliderHeader.textHorizontalAlignment = StackPanel.HORIZONTAL_ALIGNMENT_CENTER;
        xSliderHeader.textVerticalAlignment = StackPanel.VERTICAL_ALIGNMENT_CENTER;
        // xSliderHeader.text = "test"
        this.sliderPanel!.addControl(xSliderHeader);
        this.sliderPanel!.addControl(this.slider);
    }
    // The main update loop will be executed once per frame before the scene is rendered
    private update() : void
    {
        this.processControllerInput();
    }

    private processControllerInput()
    {
        this.onRightA(this.rightController?.motionController?.getComponent("a-button"));
        if (this.controllerMode && this.selectedComponent)
        {
            this.performControllerMode();
        }
    //     this.onRightB(this.rightController?.motionController?.getComponent("b-button"));
    //     this.onRightThumbstick(this.rightController?.motionController?.getComponent("xr-standard-thumbstick"));   
    }

    private controllerRotationToMeshRotation(controllerRotation: number): number
    {
        var scalingFactor = 0.001
        var thumbstick = this.rightController!.motionController!.getComponent("xr-standard-thumbstick");
        var value = thumbstick.axes.y
        scalingFactor = (1+ value + 0.000005) * scalingFactor
        controllerRotation = controllerRotation * (180 / Math.PI);
        console.log("CONTROLLER ROT:", controllerRotation)
        if (Math.abs(controllerRotation) < 5)
        {
            return 0
        }
        else if (Math.abs(controllerRotation) > 90)
        {
            return 90 * scalingFactor
        }
        else
        {
            return controllerRotation * scalingFactor;
        }
    } 


    private performControllerMode()
    {
        var controllerRotation = this.rightController!.grip!.rotationQuaternion!.toEulerAngles();
        if (this.selectedComponent instanceof RotationElement)
        {
            var componentRotation = this.selectedComponent.transformNode!.absoluteRotationQuaternion;
            // var scalingFactor = 0.005
            switch(this.selectedComponent.axis)
            {
                case Axis.X: {
                    var value = this.selectedComponent.checkBounds(this.controllerRotationToMeshRotation(controllerRotation.z))
                    this.selectedComponent.transformNode!.addRotation(value, 0, 0);
                }
                case Axis.Y: {
                    var value = this.selectedComponent.checkBounds(this.controllerRotationToMeshRotation(controllerRotation.z))
                    this.selectedComponent.transformNode!.addRotation(0, value, 0);
                }
                case Axis.Z: {
                    var value = this.selectedComponent.checkBounds(this.controllerRotationToMeshRotation(controllerRotation.z))
                    this.selectedComponent.transformNode!.addRotation(0, 0, value);
                }
            }
        }
        else 
        {

        }
    }

    private onRightA(component?: WebXRControllerComponent)
    {  
        if(component?.changes.pressed?.current)
        {
            this.controllerMode = !this.controllerMode;
        }
    }

}
/******* End of the Game class ******/   

// start the game
var game = new Game();
game.start();

// class Sliders
// {
//     private xSlider: Slider
//     private ySlider: Slider;
//     private zSlider: Slider;

//     private xSliderHeader: Control
//     private ySliderHeader: Control;
//     private zSliderHeader: Control;


//     constructor()
//     {
//         var xSlider = new Slider();
//         xSlider.minimum = 0;
//         xSlider.maximum = 360;
//         xSlider.value = 0;
//         xSlider.color = "lightblue";
//         xSlider.height = "50px";
//         xSlider.width = "500px";

//         var ySlider = new Slider();
//         ySlider.minimum = 0;
//         ySlider.maximum = 360;
//         ySlider.value = 0;
//         ySlider.color = "lightblue";
//         ySlider.height = "50px";
//         ySlider.width = "500px";

//         var zSlider = new Slider();
//         zSlider.minimum = 0;
//         zSlider.maximum = 360;
//         zSlider.value = 0;
//         zSlider.color = "lightblue";
//         zSlider.height = "50px";
//         zSlider.width = "500px";

//         this.xSlider = xSlider;
//         this.ySlider = ySlider;
//         this.zSlider = zSlider;

//         var xSliderHeader = Control.AddHeader(xSlider, "x", "50px", {isHorizontal: true, controlFirst: false});
//         xSliderHeader.horizontalAlignment = StackPanel.HORIZONTAL_ALIGNMENT_LEFT;
//         xSliderHeader.height = "75px";
//         xSliderHeader.fontSize = "48px";
//         xSliderHeader.color = "white";
//         // sliderPanel.addControl(xSliderHeader);

//         var ySliderHeader = Control.AddHeader(ySlider, "y", "50px", {isHorizontal: true, controlFirst: false});
//         ySliderHeader.horizontalAlignment = StackPanel.HORIZONTAL_ALIGNMENT_LEFT;
//         ySliderHeader.height = "75px";
//         ySliderHeader.fontSize = "48px";
//         ySliderHeader.color = "white";
//         // sliderPanel.addControl(ySliderHeader);

//         var zSliderHeader = Control.AddHeader(zSlider, "z", "50px", {isHorizontal: true, controlFirst: false});
//         zSliderHeader.horizontalAlignment = StackPanel.HORIZONTAL_ALIGNMENT_LEFT;
//         zSliderHeader.height = "75px";
//         zSliderHeader.fontSize = "48px";
//         zSliderHeader.color = "white";
//         // sliderPanel.addControl(zSliderHeader);

//         this.xSliderHeader = xSliderHeader;
//         this.ySliderHeader = ySliderHeader;
//         this.zSliderHeader = zSliderHeader

        
//     }
// }