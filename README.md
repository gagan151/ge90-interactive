# GE90-115B, interactive

An interactive isometric cutaway of a GE90-115B turbofan on a test stand. Move the probe along the rail to read pressure and temperature at each station, and drag the throttle lever to change power.

Open `ge90-light.html` or `ge90.html` in a browser.

To rebuild, run `node build.mjs` (add `--light` for the light theme). The build imports the anatomy skill's kit from `~/.claude/skills/anatomy` (see `KIT` in `build.mjs`).

`model.mjs` holds the cycle model; stage splits and part-power values are modelled from the published takeoff figures.
