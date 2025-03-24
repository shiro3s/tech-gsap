import gsap from "gsap";
import { Observer } from "gsap/Observer";
import { TextPlugin } from "gsap/TextPlugin";

gsap.registerPlugin(Observer);
gsap.registerPlugin(TextPlugin);

const sections = gsap.utils.toArray<HTMLElement>(".slide");
const images = gsap.utils.toArray<HTMLElement>(".image").reverse();
const slideImages = gsap.utils.toArray<HTMLElement>(".slide__img");
const outerWrappers = gsap.utils.toArray<HTMLElement>(".slide__outer");
const innerWrappers = gsap.utils.toArray<HTMLElement>(".slide__inner");
const count = document.querySelector(".count");

const wrap = gsap.utils.wrap(0, sections.length);

let animating: boolean;
let currentIndex = 0;

gsap.set(outerWrappers, { xPercent: 100 });
gsap.set(innerWrappers, { xPercent: -100 });
gsap.set(".slide:nth-of-type(1) .slide__outer", { xPercent: 0 });
gsap.set(".slide:nth-of-type(1) .slide__inner", { xPercent: 0 });

const gotoSection = (index: number, direction: number) => {
	animating = true;
	const sectionIndex = wrap(index);

	const tl = gsap.timeline({
		defaults: {
			duration: 1,
			ease: "expo.inOut",
		},
		onComplete: () => {
			animating = false;
		},
	});

	const currentSection = sections[currentIndex];
	const heading = currentSection.querySelector(".slide__heading");
	const nextSection = sections[sectionIndex];
	const nextHeading = nextSection.querySelector(".slide__heading");

	gsap.set([sections, images], { zIndex: 0, autoAlpha: 0 });
	gsap.set([sections[currentIndex], images[sectionIndex]], {
		zIndex: 1,
		autoAlpha: 1,
	});
	gsap.set([sections[sectionIndex], images[currentIndex]], {
		zIndex: 2,
		autoAlpha: 1,
	});

	tl.set(count, { text: `${sectionIndex + 1}` }, 0.32)
		.fromTo(
			outerWrappers[sectionIndex],
			{ xPercent: 100 * direction },
			{ xPercent: 0 },
			0,
		)
		.fromTo(
			innerWrappers[sectionIndex],
			{ xPercent: -100 * direction },
			{ xPercent: 0 },
			0,
		)
		.to(heading, { "--width": 800, xPercent: 30 * direction }, 0)
		.fromTo(
			nextHeading,
			{ "--width": 800, xPercent: -30 * direction },
			{ "--width": 200, xPercent: 0 },
			0,
		)
		.fromTo(
			images[sectionIndex],
			{ xPercent: 125 * direction, scaleX: 1.5, scaleY: 1.3 },
			{ xPercent: 0, scaleX: 1, scaleY: 1, duration: 1 },
			0,
		)
		.fromTo(
			images[currentIndex],
			{ xPercent: 0, scaleX: 1, scaleY: 1 },
			{ xPercent: -125 * direction, scaleX: 1.5, scaleY: 1.3 },
			0,
		)
		.fromTo(slideImages[sectionIndex], { scale: 2 }, { scale: 1 }, 0)
		.timeScale(0.8);

	currentIndex = sectionIndex;
};

Observer.create({
	type: "wheel,touch,pointer",
	preventDefault: true,
	wheelSpeed: -1,
	onUp: () => {
		if (animating) return;
		gotoSection(currentIndex + 1, 1);
	},
	onDown: () => {
		if (animating) return;
		gotoSection(currentIndex - 1, -1);
	},
	tolerance: 10,
});

const logKey = (e: KeyboardEvent) => {
	if ((e.code === "ArrowUp" || e.code === "ArrowLeft") && !animating) {
		gotoSection(currentIndex - 1, -1);
	}

	if (
		(e.code === "ArrowDown" ||
			e.code === "ArrowRight" ||
			e.code === "Space" ||
			e.code === "Enter") &&
		!animating
	) {
		gotoSection(currentIndex + 1, 1);
	}
};

document.addEventListener("keydown", logKey);
