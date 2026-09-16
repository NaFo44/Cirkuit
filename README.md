# Cirkuit

Build your own circuits using pixel art!

Cirkuit is a pixel-art circuit sandbox. Place components on the grid, connect
them, and build whatever you want!

[Try Cirkuit online](https://nafo44.github.io/Cirkuit/)

> AI was used as a source of information during the development of this
> project, and sometimes to generate code snippets for specific implementation problems.
> All generated code was reviewed. The concept, UI/UX, and assets were created
> entirely by me.

## Controls

- Select a component in the palette, then click or drag to place it.
- Select the eraser to remove components.
- Press `R` to rotate the selected component when rotation is supported.
- Use the mouse wheel to zoom and drag with the middle mouse button to pan.
- Switch to run mode to interact with switches and simulate the circuit.

## Development

Node.js 24 and npm are recommended.

```shell
npm ci
npm run dev
```

Run all checks before committing:

```shell
npm run format:check
npm run lint
npm test -- --run
npm run build
```
