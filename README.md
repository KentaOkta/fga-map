# fga-map

An interactive graph visualiser for [OpenFGA](https://openfga.dev/) type models.

## Getting Started

Install dependencies and start the development server:

```bash
npm install
npm run dev
```

The app will be available at **http://localhost:5173**.

## Usage

### Visualising a model

1. Paste your OpenFGA DSL into the **FGA Model** panel on the left.
2. Click **Parse model** to render the graph.
3. Not sure where to start? Click **Load sample** to load a pre-built example.

### Navigating the graph

- **Pan** — click and drag on the canvas background.
- **Zoom** — scroll wheel or the zoom controls in the bottom-left corner.
- **Move nodes** — click and drag any node.

### Expanding nodes

By default, edges between types are aggregated (e.g. *3 relations*). Click any node to expand it and see each individual relation as a labelled edge. Click again to collapse.

### Edit mode

Click the **Edit** button in the toolbar to enter edit mode. A panel will appear on the left with the following tools:

| Tool | How to use |
|------|------------|
| **New Type** | Drag the "New Type" tile onto the canvas to add a new type node. |
| **Add connection** | Drag from a node's right-side handle to another node or relation to create a new connection. |
| **Delete** | Drag the bin icon onto a type, relation, or connection to remove it. |

When you are done editing, click **✕** in the edit panel or the Edit button again to exit.
