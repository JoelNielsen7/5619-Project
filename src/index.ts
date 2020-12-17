/* CSCI 5619 Final Project
 * Authors: Joel Nielsen and Michael Ung
 * License: Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International
 */ 

import { Engine } from "@babylonjs/core/Engines/engine";
import { Scene } from "@babylonjs/core/scene";
import { Vector3, Color3, Color4, Vector2, } from "@babylonjs/core/Maths/math";
import { UniversalCamera } from "@babylonjs/core/Cameras/universalCamera";
import { Logger } from "@babylonjs/core/Misc/logger";
import { WebXRInputSource } from "@babylonjs/core/XR/webXRInputSource";
import { WebXRCamera } from "@babylonjs/core/XR/webXRCamera";
import { PointLight } from "@babylonjs/core/Lights/pointLight";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial"
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
import { Axis, Space } from "@babylonjs/core/Maths/math.axis"
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
import { Animation } from "@babylonjs/core/Animations/animation";
// import { Line } from "@babylonjs/gui/2D/controls/line"
// import { Line } from "@babylonjs/core/"

// Side effects
import "@babylonjs/core/Helpers/sceneHelpers";
import "@babylonjs/inspector";
import { LineContainerComponent } from "@babylonjs/inspector/components/actionTabs/lineContainerComponent";

enum Mode 
{
    playground,
    kinematics,
    settings
}

class RotationElement
{
    public transformNode: TransformNode | null;
    public name: string;
    public degreeLow: number;
    public degreeHigh: number
    public axis: Vector3;
    public displayName: string
    

    constructor(name: string, displayName: string, degreeLow: number, degreeHigh: number, axis: Vector3)
    {
        this.name = name;
        this.displayName = displayName;
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
                break;
            }
            case Axis.Y: {
                value = angles.y * (180 / Math.PI)
                break;
            }
            case Axis.Z: {
                value = angles.z * (180 / Math.PI)
                break;
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
    public axis: Vector3;
    public displayName: string

    constructor(name: string, displayName: string, low: number, high: number, axis: Vector3)
    {
        this.name = name;
        this.low = low;
        this.high = high;
        this.transformNode = null;
        this.axis = axis
        this.displayName = displayName;
    }

    public checkBounds(proposedTranslation: number)
    {
        var value = 0;
        switch (this.axis)
        {
            case Axis.X: {
                value =  this.transformNode!.position.x;
                break;
            }
            case Axis.Y: {
                value = this.transformNode!.position.y;
                break;
            }
            case Axis.Z: {
                value = this.transformNode!.position.z;
                break;
            }
        }

        // console.log("Trans values:", value, this.low, this.high, proposedTranslation);

        if (value + proposedTranslation > this.high && proposedTranslation > 0)
        {
            return 0;
        }
        else if (value + proposedTranslation < this.low && proposedTranslation < 0)
        {
            return 0;
        }
        else
        {
            return proposedTranslation;
        }
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
    private headMeshes: AbstractMesh[];

    private mode: Mode;

    private sliderPanel: StackPanel | null;

    private columnPanel: StackPanel | null;

    private slider: Slider | null;
    private sliderHeader: TextBlock | null;

    private selectableObjects: AbstractMesh[];

    private rotationObjects: RotationElement[];

    private translationObjects: TranslationElement[];

    private selectedComponent: RotationElement | TranslationElement | null;

    private buttonPanel: CylinderPanel | null;


    private headButtonPanel: StackPanel | null;



    private trajectory: AbstractMesh | null;

    private controllerModeButton: Button | null;

    private controllerMode: boolean;

    private degreeMesh: Mesh | null;
    private degreeLabel: TextBlock | null;

    private target: Mesh | null;
    private targetAzimuth: number;
    private targetPolar: number;

    private kinematicSliderHeaders: TextBlock[];
    private kinematicsSliders: Slider[];
    private kinematicsButton: Button | null;

    private targetLine: Mesh | null;
    
    private polarTransform: TransformNode | null;
    private azimuthalTransform: TransformNode | null;

    private buttonPanel1: StackPanel | null;
    private buttonPanel2: StackPanel | null;

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
        this.headMeshes = [];

        this.mode = Mode.playground

        this.sliderPanel = null;
        this.columnPanel = null;
        this.slider = null;
        this.sliderHeader = null;

        this.selectableObjects = [];

        this.rotationObjects = [];
        this.translationObjects = [];

        this.selectedComponent = null;

        this.buttonPanel = null;

        this.headButtonPanel = null;
        
        this.trajectory = null;

        this.controllerModeButton = null;

        this.controllerMode = false;

        this.degreeLabel = null;
        this.degreeMesh = null;

        this.target = null;
        this.targetAzimuth = 0;
        this.targetPolar = 0;

        this.kinematicsSliders = [];
        this.kinematicSliderHeaders = [];
        this.kinematicsButton = null;
        this.targetLine = null;

        this.polarTransform = null;
        this.azimuthalTransform = null;

        this.buttonPanel1 = null;
        this.buttonPanel2 = null;
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
        this.rotationObjects.push(new RotationElement("needle", "Needle", -51, 51, Axis.Z))
        this.rotationObjects.push(new RotationElement("supportArm", "Support Arm", 90, 196, Axis.X))
        this.translationObjects.push(new TranslationElement("gimbal", "Gimbal", -100, 100, Axis.X))
        this.translationObjects.push(new TranslationElement("standLowerLeft", "Lower Stand", -100, 100, Axis.Y))
        this.translationObjects.push(new TranslationElement("standLowerRight", "Lower Stand", -100, 100, Axis.Y))
        this.translationObjects.push(new TranslationElement("standUpperLeft", "Upper Stand", -60, 60, Axis.Z))
        this.translationObjects.push(new TranslationElement("standUpperRight", "Upper Stand", -60, 60, Axis.Z))
        this.translationObjects.push(new TranslationElement("trajectory", "Trajectory", -80, 50, Axis.Y))
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

        // lines creation
        
        

        var target = MeshBuilder.CreateSphere("sphere", {'diameter': 10}, this.scene);
        this.target = target;
        var targetMat = new StandardMaterial("targetMat", this.scene);
        targetMat.diffuseColor = new Color3(255, 255, 255);
        targetMat.alpha = 0.5;
        target.material = targetMat;

        var targetLineMat = new StandardMaterial("targetLineMat", this.scene);
        targetLineMat.diffuseColor = new Color3(255, 255, 255);
        var lineLength = 200;
        var targetLine = MeshBuilder.CreateCylinder("cone", {'height': lineLength, 'diameter': 1}, this.scene)
        targetLine.material = targetLineMat;
        targetLine.visibility = 1;
        var polarTransform = new TransformNode("polar")
        var azimuthalTransform = new TransformNode("azimuth")

        var lineTransformNodeDynamic = new TransformNode("angleDynamic");

        var lineTransformNodeStatic = new TransformNode("angleStatic");
        lineTransformNodeStatic.rotation.x = Math.PI / 2;
        lineTransformNodeStatic.position.z = lineLength / 2;
        
        lineTransformNodeStatic.parent = this.target;
        lineTransformNodeDynamic.parent = lineTransformNodeStatic;
        targetLine.parent = lineTransformNodeDynamic;

        // this.targetLineDynamicTransform = lineTransformNodeDynamic;
        targetLine.visibility = 0;
        this.targetLine = targetLine;


        SceneLoader.ImportMesh("", "assets/models/", "MachineModel.glb", this.scene, (meshes) => {
            meshes[0].name = "machineModel"
            var lowerStandTransform = new TransformNode("lowerStand");
            var upperStandTransform = new TransformNode("upperStand");
            lowerStandTransform.setParent(meshes[0])
            upperStandTransform.setParent(meshes[0])
            meshes[0].position = new Vector3(0, 0.8, 4.2);
            meshes[0].scaling = new Vector3(0.01, 0.01, 0.01);
            meshes[0].rotation = new Vector3(-Math.PI / 2, 0, 0)
            polarTransform.parent = meshes[0];
            azimuthalTransform.parent = polarTransform;
            target.parent = azimuthalTransform;
            target.visibility = 0;
            this.polarTransform = polarTransform;
            this.azimuthalTransform = azimuthalTransform;
            meshes.forEach((mesh) => {
                console.log("loaded ", mesh.name);
                this.fiveProbeMeshes.push(mesh)
                mesh.isPickable = false;

                if (mesh.name == "trajectory")
                {
                    var trajectoryTransform = new TransformNode("trajectory");
                    mesh.setParent(trajectoryTransform);
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
            meshes[0].position = new Vector3(0, 0.5, 4.5);
            meshes[0].scaling = new Vector3(0.01, 0.01, 0.01);
            meshes[0].rotation = new Vector3(0, 0, Math.PI)
            meshes.forEach((mesh) => {
                console.log("loaded ", mesh.name, mesh.parent ?.id);
                this.headMeshes.push(mesh);
            });
            
        });


        // Create a parent transform for the object configuration panel
        var configTransform = new TransformNode("textTransform");
        configTransform.position = new Vector3(0, .4, .75)
        configTransform.rotation = new Vector3(47, 0, 0).scale(Math.PI / 180)

        // Create a plane for the object configuration panel
        var configPlane = MeshBuilder.CreatePlane("configPlane", {width: 1.5, height: 1}, this.scene);
        
        configPlane.parent = configTransform;


        // Create a dynamic texture the object configuration panel
        var configTexture = AdvancedDynamicTexture.CreateForMesh(configPlane, 1500, 1000);
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
        // radioButtonPanel.background = (new Color4(.5, .5, .75, .25)).toHexString();
        radioButtonPanel.widthInPixels = 500;
        // radioButtonPanel.height = 1;
        radioButtonPanel.isVertical = true;
        radioButtonPanel.verticalAlignment = StackPanel.VERTICAL_ALIGNMENT_TOP;
        columnPanel.addControl(radioButtonPanel);

        // Create radio buttons for changing the object type
        var radioButton1 = new RadioButton("radioButton1");
        radioButton1.width = "50px";
        radioButton1.height = "50px";
        radioButton1.color = "lightblue";
        radioButton1.background = "black";
        radioButton1.isChecked = true;
        
        var radioButton2 = new RadioButton("radioButton2");
        radioButton2.width = "50px";
        radioButton2.height = "50px";
        radioButton2.color = "lightblue";
        radioButton2.background = "black";

        var radioButton3 = new RadioButton("radioButton3");
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

        var radioButton3Header = Control.AddHeader(radioButton3, "Settings", "500px", {isHorizontal: true, controlFirst: true});
        radioButton2Header.horizontalAlignment = StackPanel.HORIZONTAL_ALIGNMENT_LEFT;
        radioButton2Header.height = "75px";
        radioButton2Header.fontSize = "48px";
        radioButton2Header.color = "white";
        radioButtonPanel.addControl(radioButton3Header);

        // Create a transform node to hold the configurable mesh
        var configurableMeshTransform = new TransformNode("configurableMeshTransform", this.scene);
        configurableMeshTransform.position = new Vector3(0, 1, 4);

        // Event handlers for the radio buttons
        radioButton1.onIsCheckedChangedObservable.add((state) => {
            if(state)
            {
                this.mode = Mode.playground;
                this.sliderPanel!.clearControls();
                // this.configureSlider();
                this.sliderPanel!.addControl(this.sliderHeader!)
                this.sliderPanel!.addControl(this.slider!)
                this.slider!.isVisible = false;
                this.targetLine!.visibility = 0;
                this.target!.visibility = 0;
                this.sliderPanel!.addControl(this.buttonPanel1)
                this.sliderPanel!.addControl(this.buttonPanel2)

                if (this.selectedComponent) {
                    this.sliderHeader!.text = this.selectedComponent.displayName + ": " + this.slider!.value;
                }
                

                this.target!.visibility = 0;
                this.targetLine!.visibility = 0;
                
                // this.columnPanel!.addControl(this.sliderPanel)
            }
        });   

        radioButton2.onIsCheckedChangedObservable.add((state) => {
            if(state)
            {
                this.mode = Mode.kinematics;
                this.target!.visibility = 1;
                this.targetLine!.visibility = 1;
                this.configureKinematicsSliders();
                if (this.selectedComponent)
                {
                    this.selectedComponent.transformNode!.getChildMeshes().forEach((mesh) => {
                        mesh.disableEdgesRendering();
                    })
                    this.selectedComponent = null;
                }
            }
        }); 

        radioButton3.onIsCheckedChangedObservable.add((state) => {
            if(state)
            {
                this.mode = Mode.settings;
                this.columnPanel!.removeControl(this.sliderPanel!);
            }
        }); 

        // Create a stack panel for the radio buttons
        var sliderPanel = new StackPanel();
        // sliderPanel.background = (new Color4(.5, .5, .75, .25)).toHexString();
        sliderPanel.paddingTop = 0;
        sliderPanel.widthInPixels = 850;
        sliderPanel.heightInPixels = 1000;
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
        xSlider.height = "40px";
        xSlider.width = "500px";
        xSlider.horizontalAlignment = StackPanel.HORIZONTAL_ALIGNMENT_CENTER;
        xSlider.verticalAlignment = StackPanel.VERTICAL_ALIGNMENT_TOP;
        xSlider.barOffset = "10px";
        xSlider.top = "60px";
        xSlider.name = "xSlider";
        xSlider.isVisible = false;
        // xSlider.paddingTop

        // x: -100, 100
        // y: -50, 150
        // z: -100, 100
        // polar: 0, 120
        // azimuthal: -51, 51
        //
        var kinematicRanges = [new Vector2(-100, 100), new Vector2(-50, 150), new Vector2(-100, 100), new Vector2(0, 120), new Vector2(-51, 51)]
        var kinematicLabels = ["X", "Y", "Z", "Polar", "Azimuth"]

        for(var i = 0; i < 5; i++)
        {
            var kSlider = new Slider();
            var ranges = kinematicRanges[i]
            kSlider.minimum = ranges.x;
            kSlider.maximum = ranges.y;
            kSlider.value = 0;
            kSlider.color = "lightblue";
            kSlider.height = "60px";
            kSlider.width = "500px";
            // kSlider.horizontalAlignment = StackPanel.HORIZONTAL_ALIGNMENT_CENTER;
            // kSlider.verticalAlignment = StackPanel.VERTICAL_ALIGNMENT_TOP;
            // kSlider.barOffset = "10px";
            kSlider.name = "kSlider" + i;
            kSlider.isVisible = true;

            this.kinematicsSliders.push(kSlider);

            var kSliderHeader = new TextBlock("kSliderHeader" + i, kinematicLabels[i] + ": " + kSlider.value); /*Control.AddHeader(xSlider, "xxxxxxxxxxxxx", "400px", { isHorizontal: true, controlFirst: false });*/
            // kSliderHeader.horizontalAlignment = StackPanel.HORIZONTAL_ALIGNMENT_CENTER;
            kSliderHeader.height = "60px";
            kSliderHeader.fontSize = "48px";
            kSliderHeader.color = "white"; 
            // kSliderHeader.verticalAlignment = StackPanel.VERTICAL_ALIGNMENT_TOP;
            // kSliderHeader.left = "0px";
            // kSliderHeader.textHorizontalAlignment = StackPanel.HORIZONTAL_ALIGNMENT_CENTER;
            // kSliderHeader.textVerticalAlignment = StackPanel.VERTICAL_ALIGNMENT_CENTER;

            this.kinematicSliderHeaders.push(kSliderHeader);
        }

        this.kinematicsSliders[0].onValueChangedObservable.add((value) => {
            this.polarTransform!.position.x = value;
            this.kinematicSliderHeaders[0].text = kinematicLabels[0] + ": " + value;
        })
        this.kinematicsSliders[1].onValueChangedObservable.add((value) => {
            this.polarTransform!.position.y = value;
            this.kinematicSliderHeaders[1].text = kinematicLabels[1] + ": " + value;
        })
        this.kinematicsSliders[2].onValueChangedObservable.add((value) => {
            this.polarTransform!.position.z = value;
            this.kinematicSliderHeaders[2].text = kinematicLabels[2] + ": " + value;
        })
        this.kinematicsSliders[3].onValueChangedObservable.add((value) => {
            this.polarTransform!.rotation.x = -value * (Math.PI / 180)
            this.targetPolar = value * (Math.PI / 180);
            this.kinematicSliderHeaders[3].text = kinematicLabels[3] + ": " + value;
        })
        this.kinematicsSliders[4].onValueChangedObservable.add((value) => {
            this.targetAzimuth = -value * (Math.PI / 180);
            this.azimuthalTransform!.rotation.y = value * Math.PI / 180;
            this.kinematicSliderHeaders[4].text = kinematicLabels[4] + ": " + value;
        })

        var kButton = Button.CreateSimpleButton("kinematicsButton", "Go");
        kButton.paddingTop = "50px";
        kButton.width = "300px"
        kButton.height = "130px";
        kButton.background = "green";
        kButton.color  = "white";
        kButton.textBlock!.fontSize = "48px";
        kButton.onPointerUpObservable.add((value) => {
            this.performInverseKinematics();
        })

        this.kinematicsButton = kButton;
        

        // Create text headers for the sliders
        var xSliderHeader = new TextBlock("sliderHeader", "Select an object"); /*Control.AddHeader(xSlider, "xxxxxxxxxxxxx", "400px", { isHorizontal: true, controlFirst: false });*/
        xSliderHeader.horizontalAlignment = StackPanel.HORIZONTAL_ALIGNMENT_CENTER;
        xSliderHeader.height = "60px";
        xSliderHeader.fontSize = "48px";
        xSliderHeader.color = "white";
        xSliderHeader.verticalAlignment = StackPanel.VERTICAL_ALIGNMENT_TOP;
        xSliderHeader.left = "0px";
        xSliderHeader.textHorizontalAlignment = StackPanel.HORIZONTAL_ALIGNMENT_CENTER;
        xSliderHeader.textVerticalAlignment = StackPanel.VERTICAL_ALIGNMENT_CENTER;

        this.sliderHeader = xSliderHeader;

        sliderPanel.addControl(xSliderHeader);
        sliderPanel.addControl(xSlider);


        // Event handlers for the sliders
        xSlider.onValueChangedObservable.add((value) => {
            if (this.selectedComponent)
            {
                // configurableMeshTransform.rotation.x = value * Math.PI / 180;
                console.log("Slider changed to:", value);
                this.sliderHeader!.text = this.selectedComponent.displayName + ": " + value;

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
                        var currentRotation = new Vector3(0, 0, 0);
                        if(this.selectedComponent.name != "supportArm")
                        {
                            currentRotation = this.selectedComponent.transformNode!.rotationQuaternion!.toEulerAngles();
                        }
                        switch (this.selectedComponent.axis)
                        {
                            case Axis.X: {
                                if (this.selectedComponent.name == "supportArm")
                                {
                                    console.log("current rotation and value:", this.selectedComponent.transformNode!.rotation.x, value)
                                    this.selectedComponent.transformNode!.rotation.x = value * (Math.PI / 180);
                                    console.log("after:", this.selectedComponent.transformNode!.rotation.x, value)
                                }
                                else 
                                {
                                    var rotationQuaternion = Quaternion.FromEulerAngles(value  * (Math.PI / 180), currentRotation.y, currentRotation.z);
                                    this.selectedComponent.transformNode!.rotationQuaternion = rotationQuaternion// * Math.PI / 2;
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
            } else { console.log("component not selected in slider reaction"); }
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


        var manager = new GUI3DManager(this.scene);
        var anchor = new TransformNode("componentSelect");
        // anchor.position = new Vector3(0, 1.2, 1);
        anchor.position = new Vector3(0, 0, -75)
        anchor.rotation = new Vector3(23, 0, 0).scale(Math.PI / 180)
            // Create the 3D UI manager

        

        var panel = new CylinderPanel();
        panel.margin = 0.1;
        panel.radius = 6;
        panel.rows = 2;
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
            if (tra.name != "standLowerLeft" && tra.name != "standUpperLeft")
            {
                this.addButton(tra);
            }
        }
        panel.blockLayout = false;




        var buttonStackPanel1 = new StackPanel("buttonPanel1");
        buttonStackPanel1.verticalAlignment = StackPanel.VERTICAL_ALIGNMENT_TOP;
        buttonStackPanel1.horizontalAlignment = StackPanel.HORIZONTAL_ALIGNMENT_CENTER;
        buttonStackPanel1.widthInPixels = 980;
        buttonStackPanel1.heightInPixels = 300;
        buttonStackPanel1.paddingLeft = 100;
        buttonStackPanel1.isVertical = false;
        var buttonStackPanel2 = new StackPanel("buttonPanel2");
        buttonStackPanel2.isVertical = false;
        buttonStackPanel2.paddingLeft = 100;
        buttonStackPanel2.verticalAlignment = StackPanel.VERTICAL_ALIGNMENT_TOP;
        buttonStackPanel2.horizontalAlignment = StackPanel.HORIZONTAL_ALIGNMENT_CENTER;
        buttonStackPanel2.widthInPixels = 980;
        buttonStackPanel2.heightInPixels = 300;

        var x = new HolographicButton()
        for (let component of this.rotationObjects)
        {
            var button1 = Button.CreateSimpleButton("orientation", component.displayName);
            button1.height = "270px"
            button1.width = "270px"
            button1.paddingBottom = "20px"
            button1.paddingTop = "20px"
            button1.paddingLeft = "15px"
            button1.paddingRight = "15px"
            button1.background = "green"
            button1.color = "white"
            button1.textBlock!.fontSize = "48px";
            button1.onPointerClickObservable.add((value) => {
            this.objectSelected(component);

        });
            buttonStackPanel1.addControl(button1);
        }

        this.buttonPanel1 = buttonStackPanel1;
        this.buttonPanel2 = buttonStackPanel2;

        for(let component of this.translationObjects)
        {
            if(component.name == "standLowerLeft" || component.name == "standUpperLeft")
            {
                continue;
            }
            if(component.name == "gimbal")
            {
                console.log("got gimbal")
                this.addRegularButton(component, 0);
            }
            else 
            {
                console.log("not gimbal:")
                this.addRegularButton(component, 1);
            }
        }
        

        this.sliderPanel.addControl(buttonStackPanel1)
        this.sliderPanel.addControl(buttonStackPanel2)


        this.slider = xSlider;
        this.columnPanel = columnPanel;

        // Brain visibility configuration
        var sliderConfigTransform = new TransformNode("settingsTransform");

        var sliderConfigPlane = MeshBuilder.CreatePlane("configPlane", { width: 1.5, height: 3.2 }, this.scene);
        sliderConfigPlane.position = new Vector3(3, 2, 2);
        sliderConfigPlane.parent = sliderConfigTransform;

        var sliderConfigTexture = AdvancedDynamicTexture.CreateForMesh(sliderConfigPlane, 700, 830);
        sliderConfigTexture.background = (new Color4(.5, .5, .5, .25)).toHexString();

        this.headButtonPanel = new StackPanel();
        this.headButtonPanel.name = "visibility sliders"
        this.headButtonPanel.widthInPixels = 675;
        this.headButtonPanel.heightInPixels = 780;
        this.headButtonPanel.isVertical = true;
        this.headButtonPanel.horizontalAlignment = StackPanel.HORIZONTAL_ALIGNMENT_LEFT;
        this.headButtonPanel.paddingLeftInPixels = 25;
        this.headButtonPanel.paddingTopInPixels = 0;
        sliderConfigTexture.addControl(this.headButtonPanel);

        var visHeader = new TextBlock("visibilityHeader", "Visibility");
        visHeader.verticalAlignment = StackPanel.VERTICAL_ALIGNMENT_CENTER;
        visHeader.horizontalAlignment = StackPanel.HORIZONTAL_ALIGNMENT_LEFT;
        visHeader.color = "white";
        visHeader.fontSize = "48px";
        visHeader.heightInPixels = 50;
        visHeader.widthInPixels = 600;
        this.headButtonPanel.addControl(visHeader);

        var sliderArray = [];

        var acpcSlider = new Slider("acpc");
        var caudateSlider = new Slider("caudate");
        var gpeSlider = new Slider("gpe");
        var gpiSlider = new Slider("gpi");
        var putamenSlider = new Slider("putamen");
        var rnSlider = new Slider("rn");
        var snSlider = new Slider("sn");
        var stnSlider = new Slider("stn");
        var thalmusSlider = new Slider("thalamus");
        var vasculatureSlider = new Slider("vasculature");
        var brainSlider = new Slider("brain");
        var skullSlider = new Slider("skull");

        sliderArray.push(acpcSlider);
        sliderArray.push(caudateSlider);
        sliderArray.push(gpeSlider);
        sliderArray.push(gpiSlider);
        sliderArray.push(putamenSlider);
        sliderArray.push(rnSlider);
        sliderArray.push(snSlider);
        sliderArray.push(stnSlider);
        sliderArray.push(thalmusSlider);
        sliderArray.push(vasculatureSlider);
        sliderArray.push(brainSlider);
        sliderArray.push(skullSlider);

        sliderArray.forEach((slider) => {
            var panel = new StackPanel();
            panel.name = slider.name + " panel";
            panel.widthInPixels = 600;
            panel.heightInPixels = 60;
            panel.isVertical = false;
            this.headButtonPanel!.addControl(panel);

            slider.widthInPixels = 300;
            slider.heightInPixels = 50;
            slider.color = "lightblue";
            slider.top = "0px";
            slider.barOffset = "10px";
            slider.verticalAlignment = StackPanel.VERTICAL_ALIGNMENT_CENTER;
            slider.horizontalAlignment = StackPanel.HORIZONTAL_ALIGNMENT_LEFT;
            slider.isThumbClamped = true;
            slider.maximum = 1;

            var textBlock = new TextBlock(slider.name, slider.name);
            textBlock.verticalAlignment = StackPanel.VERTICAL_ALIGNMENT_CENTER;
            textBlock.horizontalAlignment = StackPanel.HORIZONTAL_ALIGNMENT_LEFT;
            textBlock.color = "white";
            textBlock.fontSize = "48px";
            textBlock.heightInPixels = 50;
            textBlock.widthInPixels = 300;
            panel.addControl(textBlock);
            panel.addControl(slider);

            // Visibility slider event handlers
            slider.onValueChangedObservable.add((value) => {
                var name = slider.name;
                console.log("Slider changed to:", value);
                this.headMeshes.forEach((mesh) => {
                    if (name! == "acpc" && (mesh.name.toLowerCase().startsWith("ac") || mesh.name.toLowerCase().startsWith("pc"))) {
                        mesh.visibility = value;
                    } else if (name! == "caudate" && (mesh.name.toLowerCase().startsWith("caudate") || mesh.name.toLowerCase().startsWith("caudate"))) {
                        mesh.visibility = value;
                    } else if (name! == "gpe" && mesh.name.toLowerCase().startsWith("gpe")) {
                        mesh.visibility = value;
                    } else if (name! == "gpi" && mesh.name.toLowerCase().startsWith("gpi")) {
                        mesh.visibility = value;
                    } else if (name! == "putamen" && mesh.name.toLowerCase().startsWith("putamen")) {
                        mesh.visibility = value;
                    } else if (name! == "rn" && mesh.name.toLowerCase().startsWith("rn")) {
                        mesh.visibility = value;
                    } else if (name! == "sn" && mesh.name.toLowerCase().startsWith("sn")) {
                        mesh.visibility = value;
                    } else if (name! == "stn" && mesh.name.toLowerCase().startsWith("stn")) {
                        mesh.visibility = value;
                    } else if (name! == "thalamus" && mesh.name.toLowerCase().startsWith("thalamus")) {
                        mesh.visibility = value;
                    } else if (name! == "vasculature" && mesh.name.toLowerCase().startsWith("vasculature")) {
                        mesh.visibility = value;
                    } else if (name! == "brain" && mesh.name.toLowerCase().startsWith("brain")) {
                        mesh.visibility = value;
                    } else if (name! == "skull" && mesh.name.toLowerCase().startsWith("skull")) {
                        mesh.visibility = value;
                    }
                });
            });
        });

        this.scene.debugLayer.show(); 
    }

    private addRegularButton(component: RotationElement | TranslationElement, row: number)
    {
        var button1 = Button.CreateSimpleButton("orientation", component.displayName);
        button1.height = "270px"
        button1.width = "270px"
        button1.paddingBottom = "20px"
        button1.paddingTop = "20px"
        button1.paddingLeft = "15px"
        button1.paddingRight = "15px"
        button1.background = "green"
        button1.color = "white"
        button1.textBlock!.fontSize = "48px";
        button1.onPointerClickObservable.add((value) => {
        this.objectSelected(component);

        });
        if (row == 0)
        {
            this.buttonPanel1!.addControl(button1);
        }
        else
        {
            this.buttonPanel2!.addControl(button1);
        }
    }

    private constructHierarchy()
    {
        var needle: RotationElement;
        var supportArm: RotationElement;
        var standLowerLeft: TranslationElement;
        var standLowerRight: TranslationElement;
        var standUpperRight: TranslationElement;
        var standUpperLeft: TranslationElement;
        var gimbal: TranslationElement;
        var trajectory: TranslationElement

        for (let rot of this.rotationObjects)
        {
            switch(rot.name)
            {
                case "needle": {
                    needle = rot;
                    break;
                }
                case "supportArm": {
                    supportArm = rot;
                    break;
                }
                    
            }
        }

        for (let tra of this.translationObjects)
        {
            switch(tra.name)
            {
                case "trajectory": {
                    trajectory = tra;
                    break;
                }
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

        trajectory!.transformNode!.setParent(needle!.transformNode!);
        needle!.transformNode!.setParent(gimbal!.transformNode!);
        gimbal!.transformNode!.setParent(supportArm!.transformNode!);
        supportArm!.transformNode!.setParent(standUpperLeft!.transformNode!);
        standUpperLeft!.transformNode!.setParent(standLowerLeft!.transformNode!);
        supportArm!.transformNode!.rotationQuaternion = null;
        supportArm!.transformNode!.rotation = new Vector3(Math.PI / 2, Math.PI, 0)
        // standLowerLeft!.transformNode!.setParent()
    }




    private addButton(component: TranslationElement | RotationElement) {
        var button = new HolographicButton("orientation");
        console.log(button.behaviors);
        this.buttonPanel!.addControl(button);


        button.text = component.displayName;
        button.onPointerClickObservable.add((value) => {
            this.objectSelected(component);

        });
        
    }

    private objectSelected(component: RotationElement | TranslationElement) 
    {
        if (this.selectedComponent)
        {
            this.selectedComponent.transformNode!.getChildMeshes().forEach((mesh) => {
                mesh.disableEdgesRendering();
            })
        }
        // this.degreeMesh!.parent = component.transformNode!;
        // this.degreeMesh!.position = new Vector3(0, 300, 0);
        // this.degreeMesh!.visibility = 1;
        // this.degreeMesh!.scaling = new Vector3(100, 100, 100);
        // this.degreeLabel!.text = component.displayName + component.transformNode!.rotation.z;
        
        this.selectedComponent = null;
        this.configureSlider(component);
        this.selectedComponent = component;
        this.selectedComponent.transformNode!.getChildMeshes().forEach((mesh) => {
            mesh.enableEdgesRendering();
        })
    }

    private configureKinematicsSliders()
    {
        this.sliderPanel!.clearControls();
        for(var i = 0; i < 5; i++)
        {
            // x: -100, 100
            // y: -50, 150
            // z: -100, 100
            console.log("adding slider:", this.kinematicsSliders[i].name!)
            this.sliderPanel!.addControl(this.kinematicSliderHeaders[i]);
            this.sliderPanel!.addControl(this.kinematicsSliders[i]);
        }
        this.sliderPanel!.addControl(this.kinematicsButton);
    }

    private configureSlider(component: RotationElement | TranslationElement)
    {
        this.sliderPanel!.clearControls();
        this.slider!.isVisible = true;
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
                    console.log("setting slider value to:", component.transformNode!.position.x, component.low, component.high)
                    break;
                }
                case Axis.Y: {
                    this.slider!.value = component.transformNode!.position.y;
                    console.log("setting slider value to:", component.transformNode!.position.y, component.low, component.high)
                    break;
                }
                case Axis.Z: {
                    this.slider!.value = component.transformNode!.position.z;
                    console.log("setting slider value to:", component.transformNode!.position.z, component.low, component.high)
                    break;
                }
            }
        }
        else
        {
            component = component as RotationElement
            this.slider!.minimum = component.degreeLow;
            this.slider!.maximum = component.degreeHigh;
            if(component.name == "supportArm")
            {
                this.slider!.value = component.transformNode!.rotation.x * (180 / Math.PI);
            }
            else
            {
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
        }

        var xSliderHeader = new TextBlock("xSliderHeader", component.displayName + ": " + this.slider!.value); // Control.AddHeader(this.slider!, component.name, "400px", {isHorizontal: true, controlFirst: false});
        xSliderHeader.horizontalAlignment = StackPanel.HORIZONTAL_ALIGNMENT_CENTER;
        xSliderHeader.height = "60px";
        xSliderHeader.fontSize = "48px";
        xSliderHeader.color = "white";
        xSliderHeader.verticalAlignment = StackPanel.VERTICAL_ALIGNMENT_TOP;
        xSliderHeader.left = "0px";
        xSliderHeader.textHorizontalAlignment = StackPanel.HORIZONTAL_ALIGNMENT_CENTER;
        xSliderHeader.textVerticalAlignment = StackPanel.VERTICAL_ALIGNMENT_CENTER;

        this.sliderHeader = xSliderHeader;

        this.sliderPanel!.addControl(xSliderHeader);
        this.sliderPanel!.addControl(this.slider);
        this.sliderPanel!.addControl(this.buttonPanel1);
        this.sliderPanel!.addControl(this.buttonPanel2);
    }
    // The main update loop will be executed once per frame before the scene is rendered
    private update() : void
    {
        this.processControllerInput();
        // this.updateMenuPosition();
    }



    private performInverseKinematics()
    {
        var targetPosition = this.polarTransform!.position;

        var needle: RotationElement;
        var supportArm: RotationElement;
        var standLowerRight: TranslationElement;
        var standUpperRight : TranslationElement;
        var gimbal: TranslationElement;

        var needleEnd: Quaternion
        var supportArmEnd: number
        var standLowerRightEnd: number
        var standUpperRightEnd: number
        var gimbalEnd: number;
        var trajectory: TranslationElement
        
        for (let component of this.rotationObjects) {
            
            // polar, x
            if (component.name == "supportArm")
            {
                supportArm = component;
                supportArmEnd = this.targetPolar + Math.PI / 2
            }
            // azimuthal, z
            else if (component.name == "needle")
            {
                var currentRotation = component.transformNode!.rotationQuaternion!.toEulerAngles();
                var rotationQuaternion = Quaternion.FromEulerAngles(currentRotation.x, currentRotation.y, this.targetAzimuth);
                needle = component;
                needleEnd = rotationQuaternion;
            }
        }

        // Transform X
        for (let component of this.translationObjects) {
            if (component.name === "standLowerRight")
            {
                standLowerRightEnd = targetPosition.y;
                standLowerRight = component;
                
            }
            else if (component.name == "standUpperRight")
            {
                standUpperRight = component;
                standUpperRightEnd = targetPosition.z;
            }
            else if (component.name == "gimbal")
            {
                gimbal = component;
                gimbalEnd = targetPosition.x;
            }
        }

        this.makeTranslationAnimation(standLowerRight!, standLowerRightEnd!);
        this.makeTranslationAnimation(standUpperRight!, standUpperRightEnd!);
        this.makeTranslationAnimation(gimbal!, gimbalEnd!);

        this.makeRotationAnimation(needle!, needleEnd!);
        this.makeSupportArmAnimation(supportArm!, supportArmEnd!);

        this.scene.beginAnimation(standLowerRight!.transformNode!, 0, 60, false);
        this.scene.beginAnimation(standUpperRight!.transformNode!, 0, 60, false);
        this.scene.beginAnimation(gimbal!.transformNode!, 0, 60, false);

        this.scene.beginAnimation(needle!.transformNode!, 0, 60, false);
        this.scene.beginAnimation(supportArm!.transformNode!, 0, 60, false);

        
    }

    private makeSupportArmAnimation(component: RotationElement, targetRotation: number)
    {
        var animation = new Animation("supportArmAnimation", "rotation.x", 30, Animation.ANIMATIONTYPE_FLOAT, Animation.ANIMATIONLOOPMODE_CYCLE);
        var xKeys = [];
        xKeys.push({
            frame: 0,
            value: component.transformNode!.rotation.x
        })
        xKeys.push({
            frame: 60,
            value: targetRotation
        })
        animation.setKeys(xKeys)
        component.transformNode!.animations = [];
        component.transformNode!.animations.push(animation);
    }

    private makeRotationAnimation(component: RotationElement, targetRotation: Quaternion)
    {
        var animation = new Animation("rotationAnimation", "rotationQuaternion", 30, Animation.ANIMATIONTYPE_QUATERNION, Animation.ANIMATIONLOOPMODE_CYCLE);
        var xKeys = [];
        xKeys.push({
            frame: 0,
            value: component.transformNode!.rotationQuaternion
        })
        xKeys.push({
            frame: 60,
            value: targetRotation
        })
        animation.setKeys(xKeys)
        component.transformNode!.animations = [];
        component.transformNode!.animations.push(animation);
    }

    private makeTranslationAnimation(component: TranslationElement, targetPosition: number)
    {
        switch (component.axis)
        {
            case Axis.X: {
                var xAnimation = new Animation("xAnimation", "position.x", 30, Animation.ANIMATIONTYPE_FLOAT, Animation.ANIMATIONLOOPMODE_CYCLE);
                var xKeys = [];
                xKeys.push({
                    frame: 0,
                    value: component.transformNode!.position.x
                })
                xKeys.push({
                    frame: 60,
                    value: targetPosition
                })
                xAnimation.setKeys(xKeys)
                component.transformNode!.animations = [];
                component.transformNode!.animations.push(xAnimation);
                break;
            }
            case Axis.Y: {
                var yAnimation = new Animation("yAnimation", "position.y", 30, Animation.ANIMATIONTYPE_FLOAT, Animation.ANIMATIONLOOPMODE_CYCLE);
                var yKeys = [];
                yKeys.push({
                    frame: 0,
                    value: component.transformNode!.position.y
                })
                yKeys.push({
                    frame: 60,
                    value: targetPosition
                })
                yAnimation.setKeys(yKeys)
                component.transformNode!.animations = [];
                component.transformNode!.animations.push(yAnimation);
                break;
            }
            case Axis.Z: {
                var zAnimation = new Animation("zAnimation", "position.z", 30, Animation.ANIMATIONTYPE_FLOAT, Animation.ANIMATIONLOOPMODE_CYCLE);
                var zKeys = [];
                zKeys.push({
                    frame: 0,
                    value: component.transformNode!.position.z
                })
                zKeys.push({
                    frame: 60,
                    value: targetPosition
                })
                zAnimation.setKeys(zKeys)
                component.transformNode!.animations = [];
                component.transformNode!.animations.push(zAnimation);
                break;
            }
        }
    }

    private updateMenuPosition()
    {
        this.buttonPanel!.position = this.xrCamera!.position;
    }

    private processControllerInput()
    {
        this.onRightA(this.rightController?.motionController?.getComponent("a-button"));
        if (this.controllerMode && this.selectedComponent)
        {
            this.performControllerMode();
        }
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

    private controllerToMeshPosition(controllerRotation: number): number
    {
        var scalingFactor = 0.05
        var thumbstick = this.rightController!.motionController!.getComponent("xr-standard-thumbstick");
        var value = thumbstick.axes.y
        scalingFactor = (1+ value + 0.000005) * scalingFactor
        controllerRotation = -controllerRotation * (180 / Math.PI);
        if (Math.abs(controllerRotation) < 5)
        {
            return 0
        }
        else if (Math.abs(controllerRotation) > 90)
        {
            if(controllerRotation > 0)
            {
                return 90 * scalingFactor;
            }
            else
            {
                return -90 * scalingFactor;
            }
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
                    this.slider!.value = this.selectedComponent.transformNode!.rotation.x;
                    break; 
                }
                case Axis.Y: {
                    var value = this.selectedComponent.checkBounds(this.controllerRotationToMeshRotation(controllerRotation.z))
                    this.selectedComponent.transformNode!.addRotation(0, value, 0);
                    this.slider!.value = this.selectedComponent.transformNode!.rotation.y; 
                    break;
                }
                case Axis.Z: {
                    var value = this.selectedComponent.checkBounds(this.controllerRotationToMeshRotation(controllerRotation.z))
                    this.selectedComponent.transformNode!.addRotation(0, 0, value);
                    this.slider!.value = this.selectedComponent.transformNode!.rotation.z; 
                    break;
                }
            }
        }
        else 
        {
            var value = this.selectedComponent!.checkBounds(this.controllerToMeshPosition(controllerRotation.z));
            if(this.selectedComponent!.name == "trajectory")
            {
                value = value * 0.2
            }
            this.selectedComponent!.transformNode!.translate(this.selectedComponent!.axis, value, Space.LOCAL)
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