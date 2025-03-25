import * as THREE from "three";
import gsap from "gsap";
import { Observer } from "gsap/Observer";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import { RGBELoader } from "three/examples/jsm/loaders/RGBELoader";

gsap.registerPlugin(Observer);
gsap.registerPlugin(ScrollTrigger);

const hdrTextureURL = new URL("/photo_studio_01_1k.hdr", import.meta.url);
const modelURL = new URL("/modellq.glb", import.meta.url);
const modelURL2 = new URL("/model.glb", import.meta.url);

const canvas = document.querySelector("canvas")!;
const loaderProgress = document.querySelector(".loader-progress");

const renderer = new THREE.WebGLRenderer({
	antialias: true,
	alpha: true,
	canvas: canvas,
});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
renderer.toneMapping = THREE.ReinhardToneMapping;
renderer.toneMappingExposure = 1.5 ** 2.0;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(
	50,
	window.innerWidth / window.innerHeight,
	0.1,
	1000,
);
camera.position.set(0, 0, 10);

const pmremGenerator = new THREE.PMREMGenerator(renderer);
pmremGenerator.compileEquirectangularShader();

const loadingManager = new THREE.LoadingManager();
const rgbeLoader = new RGBELoader(loadingManager);
const gltfLoader = new GLTFLoader(loadingManager);

const dracoLoader = new DRACOLoader();
dracoLoader.setDecoderPath("/draco/");
dracoLoader.setDecoderConfig({ type: "js" });
gltfLoader.setDRACOLoader(dracoLoader);

const raycaster = new THREE.Raycaster();

const modelsArray: THREE.Object3D<THREE.Object3DEventMap>[] = [];
const donutGroupPos: THREE.Vector3[] = [];
const donutGroupScale: THREE.Vector3[] = [];
const donutGroupScale2: THREE.Vector3[] = [];

const mouse = new THREE.Vector2();
const mousePos = { x: 0, y: 0 };

const modelMap: Map<string, THREE.Object3D<THREE.Object3DEventMap>> = new Map();

const ambientLight = new THREE.AmbientLight(0xffffff, 1);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 2.5);
scene.add(directionalLight);
directionalLight.position.set(10, 0, 1);

rgbeLoader.load(
	hdrTextureURL.href,
	(texture) => {
		scene.environment = pmremGenerator.fromEquirectangular(texture).texture;
		pmremGenerator.dispose();
	},
	undefined,
	(error) => {
		console.log(error);
	},
);

loadingManager.onLoad = () => {
	loaderInTimeline.pause();
	loaderOut();
	pageIn();
};

loadingManager.onProgress = (url, itemsLoaded, itemsTotal) => {
	if (loaderProgress)
		loaderProgress.textContent = `Loading item ${itemsLoaded} / ${itemsTotal}`;
};

const circleGeometry = new THREE.CircleGeometry(3.6, 70.0);
const circle = new THREE.LineLoop(
	circleGeometry,
	new THREE.LineBasicMaterial(),
);
circle.position.set(0, 0, 0);
circle.scale.set(0, 0, 0);
circle.material.transparent = true;
circle.material.opacity = 0;
circle.name = "circle";

const circleClone = circle.clone();
circleClone.name = "circleClone";
scene.add(circle);
scene.add(circleClone);

const rotateDonut = (target: THREE.Euler, rotation: string) => {
	const tl = gsap.timeline({
		defaults: { duration: 0.16, ease: "linear" },
		repeatRefresh: true,
		repeat: -1,
	});
	tl.to(target, { y: rotation });
};

const showMenuItem = (target: string) => {
	console.log("showMenuItem");

	gsap.set(target, { x: mousePos.x + 20, y: mousePos.y - 20 });
	gsap.to(target, {
		autoAlpha: 1,
		duration: 0.2,
		"clip-path": "polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%",
	});
};

const animate = () => {
	requestAnimationFrame(animate);
	renderer.render(scene, camera);
};

const createModel = () => {
	gltfLoader.load(modelURL2.href, (glb) => {
		const donut = glb.scene.children[0];
		donut.name = "donut";

		const icing = donut.children[0];
		// sprinkles
		const sprinkles = icing.children[0];

		// flip the donut
		donut.rotation.x = THREE.MathUtils.degToRad(90);
		donut.rotation.y = THREE.MathUtils.radToDeg(-10);
		// tweaking the roughness of toppings

		if (icing instanceof THREE.Mesh) icing.material.roughness = 0.15;

		// donut rotation loop
		rotateDonut(donut.rotation, "+=0.025");

		// add the model to our scene
		scene.add(donut);

		modelMap.set("icing", icing);
		modelMap.set("sprinkles", sprinkles);

		console.log(modelsArray);

		// start rendering the scene
		animate();

		// scrolltrigger timelines
		scrollTriggerAnims();
	});
};

const createClones = (donutLowQ: THREE.Object3D<THREE.Object3DEventMap>) => {
	// pivot point to rotate the group of donuts around
	const pivot = new THREE.Group();
	pivot.position.set(0, 0, 0);

	// group for all cloned donuts
	const donutLowQGroup = new THREE.Group();
	pivot.add(donutLowQGroup);
	scene.add(pivot);

	// create 8 cloned donuts and add them to to the group
	for (let i = 0; i <= 6; i++) {
		const donutLowQClone = donutLowQ.clone();
		donutLowQClone.name = `menu-${i}`;
		modelsArray.push(donutLowQClone);
		// clone materials
		donutLowQClone.traverse((node) => {
			if (node instanceof THREE.Mesh && node.isMesh) {
				// materials need to be cloned if we want to change
				// each donut's color individually
				node.material = node.material.clone();
			}
		});

		donutGroupPos.push(donutLowQClone.position);

		// divide the donuts in 2 groups, so we can animate the 2 groups separately
		if (i % 2 === 0) donutGroupScale.push(donutLowQClone.scale);
		else donutGroupScale2.push(donutLowQClone.scale);

		// add donut to donut group
		donutLowQGroup.add(donutLowQClone);
		// scale it
		donutLowQClone.scale.set(0, 0, 0);
		// icing color config
		const icingLowQClone = donutLowQClone.children[5];
		// sprinkles
		const sprinklesLowQClone = donutLowQClone.children[3];
		// peanuts
		const peanutsClone = donutLowQClone.children[0];
		// sprinkles pattern 2 clone
		const sprinklesLowQAltClone = donutLowQClone.children[1];
		// streaks
		const streaksClone = donutLowQClone.children[4];
		// sprinkles pattern 3 clone
		const sprinklesLowQBigClone = donutLowQClone.children[2];

		// green / yellow donut
		// red icing / purple yellow sprinks
		if (i === 0) {
			sprinklesLowQClone.visible = false;
			sprinklesLowQAltClone.visible = true;
			if (icingLowQClone instanceof THREE.Mesh)
				icingLowQClone.material.color.set("#ff3535");

			if (sprinklesLowQAltClone.children[0] instanceof THREE.Mesh)
				sprinklesLowQAltClone.children[0].material.color.set("#e0ff00");

			if (sprinklesLowQAltClone.children[1] instanceof THREE.Mesh)
				sprinklesLowQAltClone.children[1].material.color.set("#6700ff");
		}

		if (i === 1) {
			if (icingLowQClone instanceof THREE.Mesh)
				icingLowQClone.material.color.set("#0d4120");

			if (sprinklesLowQClone.children[0].children[0] instanceof THREE.Mesh)
				sprinklesLowQClone.children[0].children[0].material.color.set(
					"#e0ff00",
				);

			if (sprinklesLowQClone.children[0].children[1] instanceof THREE.Mesh)
				sprinklesLowQClone.children[0].children[1].material.color.set(
					"#e0ff00",
				);
		}

		// caramel donut
		if (i === 2) {
			if (icingLowQClone instanceof THREE.Mesh) {
				icingLowQClone.material.roughness = 0.1;
				icingLowQClone.material.color.set("#ff0e00");
			}
			sprinklesLowQClone.visible = false;
		}

		// choc / peanuts
		if (i === 3) {
			if (icingLowQClone instanceof THREE.Mesh) {
				icingLowQClone.material.color.set("#180200");
				icingLowQClone.material.roughness = 0.1;
			}

			sprinklesLowQClone.visible = false;
			peanutsClone.visible = true;

			if (peanutsClone.children[0] instanceof THREE.Mesh)
				peanutsClone.children[0].material.color.set("#ffa762");
		}

		// pink / sprinkles
		if (i === 4) {
			if (icingLowQClone instanceof THREE.Mesh)
				icingLowQClone.material.color.set("#b831c1");

			if (sprinklesLowQClone.children[0].children[0] instanceof THREE.Mesh)
				sprinklesLowQClone.children[0].children[0].material.color.set(
					"#FFFFFF",
				);

			if (sprinklesLowQClone.children[0].children[1] instanceof THREE.Mesh)
				sprinklesLowQClone.children[0].children[1].material.color.set(
					"#05a01a",
				);
		}

		//
		if (i === 5) {
			if (icingLowQClone instanceof THREE.Mesh) {
				icingLowQClone.material.roughness = 0.15;
				icingLowQClone.material.color.set("#FFFFFF");
			}

			sprinklesLowQClone.visible = false;
			sprinklesLowQBigClone.visible = true;
		}

		// choc with sauce donut
		if (i === 6) {
			if (icingLowQClone instanceof THREE.Mesh) {
				icingLowQClone.material.roughness = 0.2;
				icingLowQClone.material.color.set("#180500");
			}

			sprinklesLowQClone.visible = false;
			streaksClone.visible = true;
		}

		// donut rotation loop
		rotateDonut(donutLowQClone.rotation, "-=0.025");
	}

	// rotate the donut clones group around pivot point
	gsap.to(donutLowQGroup.rotation, {
		z: "+=0.02",
		repeat: -1,
		yoyo: true,
		yoyoEase: "none",
		duration: 2,
		ease: "none",
	});

	// set position for each donut
	// inner ring
	gsap.set(donutGroupPos[1], { x: -2, y: 0.25 });
	gsap.set(donutGroupPos[3], { x: 0.25, y: 2 });
	gsap.set(donutGroupPos[5], { x: 2, y: -0.25 });

	// outer ring
	gsap.set(donutGroupPos[2], { x: -2.55, y: -2.5 });
	gsap.set(donutGroupPos[4], { x: -2.55, y: 2.5 });
	gsap.set(donutGroupPos[6], { x: 2.55, y: 2.5 });
	gsap.set(donutGroupPos[7], { x: 2.55, y: -2.5 });

	// we create the lq model and the lq clones first
	// then we create hq model
	createModel();
};

gltfLoader.load(
	modelURL.href,
	(gltf) => {
		const model = gltf.scene;
		const donutLowQ = model.children[0];
		const icingLowQ = donutLowQ.children[5];

		const sprinklesLowQ = donutLowQ.children[3];
		const sprinklesLowQAlt = donutLowQ.children[1];
		const peanuts = donutLowQ.children[0];
		const streaks = donutLowQ.children[4];
		const sprinklesLowQBig = donutLowQ.children[2];

		peanuts.visible = false;
		sprinklesLowQAlt.visible = false;
		streaks.visible = false;
		sprinklesLowQBig.visible = false;

		donutLowQ.rotation.x = THREE.MathUtils.degToRad(90);
		donutLowQ.rotation.y = THREE.MathUtils.degToRad(-10);
		donutLowQ.scale.set(0, 0, 0);

		if (icingLowQ instanceof THREE.Mesh) icingLowQ.material.roughness = 0.15;

		createClones(donutLowQ);
		donutGroupPos.push(donutLowQ.position);
		donutGroupScale.push(donutLowQ.scale);

		modelsArray.push(donutLowQ);

		if (icingLowQ instanceof THREE.Mesh) {
			icingLowQ.material.roughness = 0.15;
			icingLowQ.material.color.set("#f78130");
		}

		sprinklesLowQ.visible = false;
		sprinklesLowQAlt.visible = true;

		modelMap.set("donutLowQ", donutLowQ);
		modelMap.set("icingLowQ", donutLowQ);
		modelMap.set("sprinklesLowQ", sprinklesLowQ);
		modelMap.set("sprinklesLowQAlt", sprinklesLowQAlt);
		modelMap.set("peanuts", peanuts);
		modelMap.set("streaks", streaks);
		modelMap.set("sprinklesLowQBig", sprinklesLowQBig);

		gsap.set(donutGroupPos[0], { x: -0.25, y: -2 });
		rotateDonut(donutLowQ.rotation, "-=0.025");
	},
	undefined,
	(error) => {
		console.log(error);
	},
);

gsap.set(".donut-info circle", { autoAlpha: 0 });
gsap.set(".donut-info p", { autoAlpha: 0 });

// scroll indicator timeline
const indicatorTl = gsap.timeline({
	repeat: -1,
	repeatDelay: 0.3,
	paused: true,
});

indicatorTl.fromTo(
	".scroll-indicator span",
	{ y: -10 },
	{ y: 90, ease: "power3.inOut", duration: 1 },
	"scroll",
);

const arrowTl = gsap.timeline({
	paused: true,
	repeat: 1,
	repeatDelay: 0.3,
	defaults: { ease: "sine.in", duration: 0.4 },
});

arrowTl.to(
	"#l,#r",
	{
		keyframes: [{ "stroke-dashoffset": "0px" }, { opacity: 0 }],
	},
	0.4,
);

let indicatorVis = false;

const scrollTriggerAnims = () => {
	const homeTl = gsap.timeline({
		defaults: { ease: "none" },
		scrollTrigger: {
			trigger: ".home",
			start: "top top",
			end: "+=100%",
			scrub: true,
			onUpdate: (self) => {
				if (
					self.progress < 0.5 &&
					self.direction === -1 &&
					indicatorVis === true
				) {
					gsap.to(".scroll-indicator,.scroll-indicator-arrow", {
						autoAlpha: 0,
						y: -40,
					});
					indicatorTl.pause();
					arrowTl.pause();
					indicatorVis = false;
				}
				if (
					self.progress > 0.32 &&
					self.progress !== 1 &&
					self.direction === 1 &&
					indicatorVis === false
				) {
					gsap.fromTo(
						".scroll-indicator,.scroll-indicator-arrow",
						{ autoAlpha: 0, y: -40 },
						{ autoAlpha: 1, y: 0, stagger: 0.04 },
					);
					indicatorTl.play();
					arrowTl.progress() === 1 ? arrowTl.restart() : arrowTl.play();
					indicatorVis = true;
				}
			},
		},
	});

	const discoverTl = gsap.timeline({
		defaults: { ease: "none" },
		scrollTrigger: {
			trigger: ".discover",
			start: "top top",
			end: "+=200%",
			scrub: true,
		},
	});

	const menuTl = gsap.timeline({
		defaults: { ease: "none" },
		scrollTrigger: {
			trigger: ".menu",
			start: "top top",
			end: "+=100%",
			scrub: true,
		},
	});

	const shopTl = gsap.timeline({
		defaults: { ease: "none" },
		scrollTrigger: {
			trigger: ".shop",
			start: "top top",
			end: "bottom bottom",
			scrub: true,
			onUpdate: (self) => {
				if (
					self.progress < 0.7 &&
					self.progress !== 1 &&
					self.direction === -1 &&
					indicatorVis === false
				) {
					gsap.to(".scroll-indicator", { opacity: 1, y: 0 });
					indicatorTl.play();
					indicatorVis = true;
				}
				if (
					self.progress > 0.7 &&
					self.progress !== 1 &&
					self.direction === 1 &&
					indicatorVis === true
				) {
					gsap.to(".scroll-indicator", { opacity: 0, y: -40 });
					indicatorTl.pause();
					indicatorVis = false;
				}
			},
		},
	});

	homeTl
		.fromTo(
			".home h1",
			{ y: 0, autoAlpha: 1 },
			{ autoAlpha: 0, y: -100, scale: 1.2, duration: 0.5 },
			0,
		)
		.fromTo(
			".home .cta-button",
			{ y: 0, autoAlpha: 1 },
			{ autoAlpha: 0, y: -100, duration: 0.5 },
			0,
		)
		.to(".social-list", { y: 100, autoAlpha: 0, duration: 0.25 }, 0)
		.to(scene.children[5].rotation, { x: "-=1.4", duration: 0.3 }, 0)
		.fromTo(
			scene.children[5].scale,
			{ x: 55, y: 55, z: 55 },
			{ x: 45, y: 45, z: 45, duration: 0.3 },
			0,
		);

	discoverTl
		// showing donut info
		.to(".discover .container", { autoAlpha: 1, duration: 0.01 }, 0)
		.to(scene.children[5].position, { y: -0.68 }, 0)
		.to(modelMap.get("icing")!.position, { y: 0.032 }, 0)
		.to(modelMap.get("sprinkles")!.position, { y: "+=0.014" }, 0)
		.to(".donut-info polyline", { stagger: 0.1, duration: 0.1 }, 0)
		.to(".donut-info path", { stagger: 0.1, duration: 0.1 }, 0.1)
		.to(
			".donut-info p",
			{
				autoAlpha: 1,
				stagger: 0.1,
				duration: 0.1,
				"clip-path": "polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)",
			},
			0.2,
		)
		.to(
			".donut-info circle",
			{ autoAlpha: 1, stagger: 0.1, duration: 0.1 },
			0.2,
		)

		// removing donut info and preparing donut for next scroll tl
		.to(scene.children[5].rotation, { x: "+=1.4" }, 0.7)
		.to(scene.children[5].position, { y: "+=0.68" }, 0.8)
		.to(modelMap.get("icing")!.position, { y: "-=0.021" }, 0.8)
		.to(modelMap.get("sprinkles")!.position, { y: "-=0.014" }, 0.8)

		.to(
			".donut-info p",
			{
				autoAlpha: 0,
				stagger: 0.1,
				duration: 0.1,
				"clip-path": "polygon(0% 0%, 0% 0%, 0% 100%, 0% 100%)",
			},
			1.1,
		)
		.to(
			".donut-info circle",
			{ autoAlpha: 0, stagger: 0.1, duration: 0.1 },
			1.1,
		)
		.to(".donut-info path", { stagger: 0.1, duration: 0.1 }, 1.2)
		.to(".donut-info polyline", { stagger: 0.1, duration: 0.1 }, 1.3);

	menuTl
		.to(".menu .container", { autoAlpha: 1, duration: 0.01 }, 0)
		.to(
			".container-background",
			{
				scaleY: 0,
				transformOrigin: "50% 0%",
				autoAlpha: 0,
				ease: "back.in(0.5)",
			},
			0,
		)
		.to(scene.children[5].scale, { x: 24, y: 24, z: 24 }, 0)
		.to((scene.children[3] as THREE.Mesh).material, { opacity: 1 }, 0.3)
		.to(
			(scene.children[3] as THREE.Mesh).scale,
			{ x: 0.55, y: 0.55, z: 0.55 },
			0.3,
		)
		.to((scene.children[2] as THREE.Mesh).material, { opacity: 1 }, 0.4)
		.to((scene.children[2] as THREE.Mesh).scale, { x: 1, y: 1, z: 1 }, 0.4)
		.to(
			donutGroupScale,
			{
				x: 6,
				y: 6,
				z: 6,
				ease: "back.out(2)",
				stagger: 0.2,
			},
			0.7,
		)
		.to(
			donutGroupScale2,
			{
				x: 6,
				y: 6,
				z: 6,
				ease: "back.out(2)",
				stagger: 0.2,
			},
			0.9,
		);

	shopTl
		.to(".shop .container", { autoAlpha: 1, duration: 0.01 }, 0)
		// remove donuts
		.to((scene.children[2] as THREE.Mesh).material, { opacity: 0 }, 0.6)
		.to((scene.children[3] as THREE.Mesh).material, { opacity: 0 }, 0.8)
		.to(
			donutGroupScale2,
			{ x: 0, y: 0, z: 0, stagger: 0.2, ease: "back.in(2)" },
			0,
		)
		.to(
			donutGroupScale,
			{ x: 0, y: 0, z: 0, stagger: 0.2, ease: "back.in(2)" },
			0.2,
		)
		.to(scene.children[5].scale, { x: 0, y: 0, z: 0 }, 1.3)
		.fromTo(
			".shop p, .cta-wrap",
			{ y: gsap.utils.wrap([-30, -20]) },
			{ y: 0, autoAlpha: 1, stagger: 0.3 },
			1.5,
		);
};

// loader / nav
const loaderSprinkles = document.querySelectorAll("#sprinkles line");
const donutFront = document.querySelector("#donut-front");
const donutBackInner = document.querySelectorAll("#donut-back-inner");
const donutBackOuter = document.querySelector("#donut-back-outer");

// Preloader in animation
const loaderIn = () => {
	gsap.set(loaderSprinkles, {});
	const tl = gsap.timeline({
		repeat: -1,
		repeatDelay: 0.25,
		repeatRefresh: true,
		paused: true,
	});
	tl.to(loaderSprinkles, { ease: "expo.inOut" }, "in")
		.to(
			donutFront,
			{ rotation: "+=90", transformOrigin: "50% 50%", ease: "back.out" },
			"out",
		)
		.to(
			donutBackInner,
			{ rotation: "+=90", transformOrigin: "36% 50%", ease: "back.out" },
			"out",
		)
		.to(
			donutBackOuter,
			{ rotation: "+=90", transformOrigin: "46% 50%", ease: "back.out" },
			"out",
		)
		.to(loaderSprinkles, {}, "out");
	return tl;
};
const loaderInTimeline = loaderIn();

// Preloader load complete animation
const loaderOut = () => {
	const tl = gsap.timeline({});
	tl.to(
		".loader-donut,.loader-progress",
		{
			autoAlpha: 0,
			y: 10,
			scale: 0,
			transformOrigin: "50% 50%",
			ease: "back.in",
		},
		"out",
	)
		.to(
			".loader-curtains span",
			{
				y: gsap.utils.wrap(["-100%", "100%", "-100%", "100%"]),
				stagger: 0.1,
				ease: "power2.inOut",
				duration: 0.6,
			},
			"out+=0.3",
		)
		.set(".loader", { autoAlpha: 0 });

	return tl;
};

// Page in animation
const pageIn = () => {
	const tl = gsap.timeline();
	tl.fromTo(".container-background", { y: 20 }, { y: 0, ease: "expo.out" }, 0.6)
		.fromTo(
			scene,
			{ x: 0, y: 0, z: 0 },
			{ x: 55, y: 55, z: 55, ease: "back.out(1.3)", duration: 0.8 },
			0.74,
		)
		.fromTo(".home h1", { autoAlpha: 0, y: 20 }, { y: 0, autoAlpha: 1 }, 0.88)
		.fromTo(
			".home .cta-button",
			{ autoAlpha: 0, y: 20 },
			{ y: 0, autoAlpha: 1 },
			1.08,
		);
	return tl;
};

// active links while using navbar links
const main = document.querySelector("main");
const options = {
	root: document, //https://github.com/w3c/IntersectionObserver/issues/283
	rootMargin: "-50% 0% -50%",
	threshold: 0,
};

const setActive = (entry: IntersectionObserverEntry) => {
	const navLink = document.querySelector(`a[data-ref='${entry.target.id}']`);
	const active = document.querySelector(".active");
	active ? active.classList.remove("active") : null;
	navLink ? navLink.classList.add("active") : null;
};

const sectionObserver = new IntersectionObserver((entries, observer) => {
	entries.forEach((entry) => {
		if (!entry.isIntersecting) return;

		setActive(entry);
	});
}, options);

const mainArray = Array.from(main!.children);
mainArray.forEach((el) => {
	sectionObserver.observe(el);
});

window.addEventListener("DOMContentLoaded", () => {
	loaderInTimeline.play();
});

const animateDonutOnMove = (e: MouseEvent) => {
	mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
	mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
	tiltDonut();
	mousePos.x = e.clientX;
	mousePos.y = e.clientY;

	// update the picking ray with the camera and mouse position
	raycaster.setFromCamera(mouse, camera);

	// calculate objects intersecting the picking ray
	const intersects = raycaster.intersectObjects(modelsArray);

	console.log(intersects)

	intersects.forEach((intersect) => {
		const name = intersect.object.name;
		switch (name) {
			case "menu-0":
				showMenuItem("#menu-item-1");
			case "menu-1":
				showMenuItem("#menu-item-2");
			case "menu-2":
				showMenuItem("#menu-item-3");
			case "menu-3":
				showMenuItem("#menu-item-4");
			case "menu-4":
				showMenuItem("#menu-item-5");
			case "menu-5":
				showMenuItem("#menu-item-6");
			case "menu-6":
				showMenuItem("#menu-item-7");
			case "menu-7":
				showMenuItem("#menu-item-8");
		}
	});
};

window.addEventListener("mousemove", animateDonutOnMove);

const handleResize = () => {
	const width = window.innerWidth;
	const height = window.innerHeight;

	camera.aspect = width / height;
	const camZ = (screen.width - width * 1) / 30;
	camera.position.z = camZ < 40 ? 10 : camZ / 3.25;
	camera.updateProjectionMatrix();
	renderer.setPixelRatio(window.devicePixelRatio);
	renderer.setSize(width, height);
};

window.addEventListener("resize", handleResize);

const tiltDonut = () => {
	gsap.to(scene.children[5].rotation, {
		z: -mouse.x / 10 + mouse.y / 10,
		ease: "power4.out",
	});
	gsap.to(scene.children[5].position, {
		x: -mouse.x / 20 + mouse.y / 20,
		ease: "power4.out",
	});
};

const animateDonutOnTouch = (e: TouchEvent) => {
	const touch = e.targetTouches[0];

	if (touch) {
		mouse.x = touch.clientX / window.innerWidth;
		mouse.y = touch.clientY / window.innerHeight;
		tiltDonut();
	}
};

window.addEventListener("touchmove", animateDonutOnTouch);
