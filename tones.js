const soundList = document.querySelector(".sound-list");
const soundError = soundList.querySelector(".sound-error");
const tones = [...soundList.querySelectorAll("audio")];

for (const tone of tones) {
  const button = tone.nextElementSibling;
  const { play, pause } = button.dataset;

  const updateButton = () => {
    const playing = !tone.paused && !tone.ended;
    button.classList.toggle("is-playing", playing);
    button.setAttribute("aria-label", playing ? pause : play);
  };

  button.addEventListener("click", async () => {
    soundError.textContent = "";

    if (!tone.paused) {
      tone.pause();
      return;
    }

    for (const otherTone of tones) {
      if (otherTone !== tone) otherTone.pause();
    }

    if (tone.error) tone.load();

    try {
      await tone.play();
    } catch (error) {
      if (error.name !== "AbortError") {
        soundError.textContent = soundList.dataset.error;
      }
    }
    updateButton();
  });

  for (const event of ["play", "pause", "ended"]) {
    tone.addEventListener(event, updateButton);
  }
  button.hidden = false;
}

soundList.classList.add("has-player");
