import gsap from "gsap";
import html2canvas from "html2canvas";
import imagesLoaded from "imagesloaded";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const count = 30;
const repeat_count = 3;

const capture = document.querySelector<HTMLElement>(".capture");

const createCanvases = (captureEl: HTMLElement) => {
	html2canvas(captureEl).then((canvas) => {
		const width = canvas.width;
		const height = canvas.height;

		// biome-ignore lint:
		const ctx = canvas.getContext("2d")!;

		const imageData = ctx.getImageData(0, 0, width, height);
		const dataList = [];
		captureEl.style.display = "none";

		for (let i = 0; i < count; i++)
			dataList.push(ctx.createImageData(width, height));

		for (let x = 0; x < width; x++) {
			for (let y = 0; y < height; y++) {
				for (let l = 0; l < repeat_count; l++) {
					const index = (x + y * width) * 4;
					const dataIndex = Math.floor(
						(count * (Math.random() + (2 * x) / width)) / 3,
					);

					for (let p = 0; p < 4; p++)
						dataList[dataIndex].data[index + p] = imageData.data[index + p];
				}
			}
		}

		dataList.forEach((data, i) => {
			const clonedCanvas = canvas.cloneNode() as HTMLCanvasElement;
			clonedCanvas.getContext("2d")?.putImageData(data, 0, 0);
			clonedCanvas.className = "capture-canvas";
			document.body.appendChild(clonedCanvas);

			const randomAngle = (Math.random() - 0.5) * 2 * Math.PI;
			const randomRotationAngle = 30 * (Math.random() - 0.5);

			const tl = gsap.timeline({
				scrollTrigger: {
					scrub: 1,
					start: () => 0,
					end: () => window.innerHeight * 2,
				},
			});

			tl.to(clonedCanvas, {
				duration: 1,
				rotate: randomRotationAngle,
				translateX: 40 * Math.sin(randomAngle),
				translateY: 40 * Math.cos(randomAngle),
				opacity: 0,
				delay: (i / dataList.length) * 2,
			});
		});
	});
};

const images = gsap.utils.toArray<HTMLImageElement>("img");

imagesLoaded(images).on("always", () => {
	if (capture) createCanvases(capture);
});
