# fga-map

An interactive graph visualiser for [OpenFGA](https://openfga.dev/) type models. Paste or author a DSL model and explore the authorization relationships as a navigable graph, with full support for conditions, edit mode, and live DSL sync.

## Getting Started

```bash
npm install
npm run dev
```

The app will be available at **http://localhost:5173**.

## Layout

The interface has two main areas:

| Area | Description |
|------|-------------|
| **Left sidebar** | Tabbed panel — switch between the **Model** (DSL textarea) and **Inspect** (selected type + conditions) views |
| **Canvas** | Interactive graph — pan, zoom, and click to explore or edit the model |

---

## Visualising a Model

1. Select the **Model** tab in the left sidebar.
2. Paste your OpenFGA DSL into the textarea, then click **Parse model**.
3. Not sure where to start? Click **Load sample** to load a pre-built example.

The DSL textarea stays in sync with all canvas edits — any change made in edit mode is immediately reflected as updated DSL.

---

## Navigating the Graph

| Action | How |
|--------|-----|
| **Pan** | Click and drag the canvas background |
| **Zoom** | Scroll wheel, or the zoom controls (bottom-left) |
| **Move a node** | Click and drag it |
| **Expand a node** | Click it to reveal individual relation edges; click again to collapse |

By default, edges between types are **aggregated** — a single edge labelled *"N relations"* (or the relation name when there is only one). Clicking a node **expands** it to show each relation as a separate labelled edge.

---

## The Inspect Panel

Switch to the **Inspect** tab to see the currently selected type and all model conditions.

### Selecting a type

Click any node on the canvas. The sidebar automatically switches to the **Inspect** tab and shows:

- The type name
- Each relation defined on that type, with its full list of refs (e.g. `user`, `group#member`, `user with non_expired_grant`)

### Conditions section

The lower part of the Inspect panel lists every `condition` block defined in the model. Each item is collapsible and shows:

- **Name**
- **Parameters** — name and type of each CEL parameter
- **Expression** — the CEL expression body

Clicking a condition name badge on an expanded edge in the graph automatically opens the Inspect tab and scrolls to that condition.

### Condition indicators on edges

| Symbol | Meaning |
|--------|---------|
| `*` | Every matching ref on this edge is conditioned |
| `…` | Some refs are conditioned, some are plain |
| *(none)* | No conditioned refs |

On **collapsed** edges the symbol is appended to the label. On **expanded** edges the condition name appears as a clickable badge — click it to jump to the condition in the Inspect panel.

---

## Edit Mode

Click the **pencil icon** in the canvas toolbar (bottom-left) to enter edit mode. The toolbar button turns highlighted when active; click it again to exit.

In edit mode the **Inspect** panel gains additional tools:

### Type section (top)

| Element | Purpose |
|---------|---------|
| **New Type card** | Drag it onto the canvas to create a new type node at the drop position |
| **Type name** | Click to edit inline; confirm with Enter or by clicking away |
| **Relation names** | Click to edit inline; confirm with Enter or by clicking away |
| **× button** | Delete the relation |

### Adding connections

Drag from a node's **right-side handle** to another node or to a specific relation handle to create a new connection. If you drop onto the node body (not a relation), a new auto-named relation is created.

### Conditions section

| Action | How |
|--------|-----|
| **Add condition** | Click **+ Add** in the Conditions section header |
| **Edit name** | Click the name field and type; confirms on blur |
| **Edit parameters** | Use the name input and type dropdown (all OpenFGA CEL types supported) |
| **Edit expression** | Type directly into the expression textarea |
| **Attach condition to edge** | Drag a condition item onto an expanded edge to add a conditioned ref |
| **Delete condition** | Drag the condition item onto the bin, or drag the bin onto the condition item |

### Deleting things

The **bin** (bottom of the Inspect panel) is the primary delete tool:

| Target | How |
|--------|-----|
| **Type** | Drag the bin onto the type's header node on the canvas |
| **Relation** | Drag the bin onto the relation row inside the expanded node |
| **Connection / edge** | Drag the bin onto the edge label (collapsed) or the midpoint zone (expanded) |
| **Condition** | Drag the bin onto the condition item in the panel, or drag the condition onto the bin |

---

## Tech Stack

| Library | Purpose |
|---------|---------|
| [React 18](https://react.dev/) | UI framework |
| [Vite 5](https://vitejs.dev/) | Build tooling and dev server |
| [@xyflow/react](https://reactflow.dev/) | Interactive graph canvas (React Flow v12) |
| [@dagrejs/dagre](https://github.com/dagrejs/dagre) | Automatic graph layout |

## Building for Production

```bash
npm run build
```

Output is written to `dist/`.
