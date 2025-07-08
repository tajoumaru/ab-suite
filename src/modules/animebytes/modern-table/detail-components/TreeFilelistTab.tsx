import { ChevronDown, ChevronRight } from "lucide-preact";
import type { JSX } from "preact";
import { useMemo, useState } from "preact/hooks";
import type { FilelistItem } from "../types";

interface TreeFilelistTabProps {
  filelist: FilelistItem[];
  torrentId: string;
}

interface TreeNode {
  id: number;
  name: string;
  displayName: string;
  size: number;
  isFile: boolean;
  children: TreeNode[];
  parent?: TreeNode;
  isExpanded: boolean;
  depth: number;
}

// Size conversion utilities
function sizeInBytes(text: string): number {
  const match = text.match(/^([0-9,.]+)\s*([KMGT]?i?B)$/i);
  if (!match) return 0;

  const value = parseFloat(match[1].replace(/,/g, ""));
  const unit = match[2].toUpperCase();

  const multipliers: Record<string, number> = {
    B: 1,
    KIB: 1024,
    MIB: 1024 ** 2,
    GIB: 1024 ** 3,
    TIB: 1024 ** 4,
    KB: 1024,
    MB: 1024 ** 2,
    GB: 1024 ** 3,
    TB: 1024 ** 4,
  };

  return value * (multipliers[unit] || 1);
}

function bytesToText(size: number): string {
  if (size === 0) return "0 B";

  const units = ["B", "KiB", "MiB", "GiB", "TiB"];
  let unitIndex = 0;
  let value = size;

  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex++;
  }

  const formatted = unitIndex === 0 ? value.toString() : value.toFixed(2);
  return `${formatted} ${units[unitIndex]}`;
}

/**
 * Tree-style file view component inspired by U2's filelist
 */
export function TreeFilelistTab({ filelist }: TreeFilelistTabProps) {
  const [expandedNodes, setExpandedNodes] = useState<Set<number>>(new Set());
  const [allExpanded, setAllExpanded] = useState(false);

  // Build tree structure from flat filelist
  const treeData = useMemo(() => {
    if (filelist.length === 0) return { root: null, nodes: new Map<number, TreeNode>() };

    const nodes = new Map<number, TreeNode>();
    const folderMap = new Map<string, TreeNode>();
    let idCounter = 1;

    // Root node
    const root: TreeNode = {
      id: 0,
      name: "",
      displayName: "",
      size: 0,
      isFile: false,
      children: [],
      isExpanded: true,
      depth: 0,
    };
    nodes.set(0, root);

    // Process each file
    for (const file of filelist) {
      const pathParts = file.filename.split("/");
      const fileSize = sizeInBytes(file.size);
      let currentParent = root;

      // Create/find all parent directories
      for (let i = 0; i < pathParts.length - 1; i++) {
        const pathSoFar = pathParts.slice(0, i + 1).join("/");
        const folderName = pathParts[i];

        if (!folderMap.has(pathSoFar)) {
          // Create new folder node
          const folderNode: TreeNode = {
            id: idCounter++,
            name: pathSoFar,
            displayName: folderName,
            size: 0,
            isFile: false,
            children: [],
            parent: currentParent,
            isExpanded: false,
            depth: i + 1,
          };

          folderMap.set(pathSoFar, folderNode);
          nodes.set(folderNode.id, folderNode);
          currentParent.children.push(folderNode);
          currentParent = folderNode;
        } else {
          const existingFolder = folderMap.get(pathSoFar);
          if (existingFolder) {
            currentParent = existingFolder;
          }
        }
      }

      // Create file node
      const fileName = pathParts[pathParts.length - 1];
      const fileNode: TreeNode = {
        id: idCounter++,
        name: file.filename,
        displayName: fileName,
        size: fileSize,
        isFile: true,
        children: [],
        parent: currentParent,
        isExpanded: false,
        depth: pathParts.length,
      };

      nodes.set(fileNode.id, fileNode);
      currentParent.children.push(fileNode);

      // Update parent folder sizes
      let parent: TreeNode | undefined = currentParent;
      while (parent) {
        parent.size += fileSize;
        parent = parent.parent;
      }
    }

    // Sort children: folders first, then files, both alphabetically
    const sortChildren = (node: TreeNode) => {
      node.children.sort((a, b) => {
        if (a.isFile !== b.isFile) {
          return a.isFile ? 1 : -1; // Folders first
        }
        return a.displayName.localeCompare(b.displayName);
      });

      node.children.forEach(sortChildren);
    };

    sortChildren(root);

    return { root, nodes };
  }, [filelist]);

  // Toggle node expansion
  const toggleNode = (nodeId: number) => {
    setExpandedNodes((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(nodeId)) {
        newSet.delete(nodeId);
        // Recursively collapse all children
        const collapseChildren = (node: TreeNode) => {
          newSet.delete(node.id);
          node.children.forEach(collapseChildren);
        };
        const node = treeData.nodes.get(nodeId);
        if (node) {
          node.children.forEach(collapseChildren);
        }
      } else {
        newSet.add(nodeId);
      }
      return newSet;
    });
  };

  // Toggle all nodes
  const toggleAll = () => {
    if (allExpanded) {
      setExpandedNodes(new Set());
      setAllExpanded(false);
    } else {
      const allNodeIds = new Set<number>();
      treeData.nodes.forEach((node, id) => {
        if (!node.isFile && id !== 0) {
          allNodeIds.add(id);
        }
      });
      setExpandedNodes(allNodeIds);
      setAllExpanded(true);
    }
  };

  // Render tree node
  const renderNode = (node: TreeNode, isVisible: boolean = true): JSX.Element[] => {
    if (node.id === 0) {
      // Root node, render only children
      return node.children.flatMap((child) => renderNode(child, true));
    }

    if (!isVisible) {
      return [];
    }

    const isExpanded = expandedNodes.has(node.id);
    const hasChildren = node.children.length > 0;
    const indent = "&nbsp;&nbsp;&nbsp;".repeat(node.depth - 1);

    const elements: JSX.Element[] = [];

    // Current node row
    elements.push(
      <tr key={node.id} className="ab-filelist-row">
        <td className="ab-filelist-cell ab-filelist-cell-filename">
          {hasChildren ? (
            <button
              type="button"
              style={{
                display: "flex",
                alignItems: "center",
                background: "none",
                border: "none",
                color: "inherit",
                font: "inherit",
                cursor: "pointer",
                padding: 0,
                textAlign: "left",
                width: "100%",
              }}
              onClick={() => toggleNode(node.id)}
              aria-label={`${isExpanded ? "Collapse" : "Expand"} ${node.displayName}`}
            >
              <span dangerouslySetInnerHTML={{ __html: indent }} />
              <span style={{ marginRight: "4px" }}>
                {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              </span>
              <code
                style={{
                  fontFamily: "monospace",
                  fontSize: "1.2em",
                  fontWeight: "bold",
                }}
              >
                {node.displayName}
              </code>
            </button>
          ) : (
            <div
              style={{
                display: "flex",
                alignItems: "center",
              }}
            >
              <span dangerouslySetInnerHTML={{ __html: indent }} />
              <code
                style={{
                  fontFamily: "monospace",
                  fontSize: "1.2em",
                  fontWeight: "normal",
                }}
              >
                {node.displayName}
              </code>
            </div>
          )}
        </td>
        <td className="ab-filelist-cell ab-filelist-cell-size">
          <span style={{ opacity: node.isFile ? "100%" : "60%" }}>
            {node.isFile ? bytesToText(node.size) : `[${bytesToText(node.size)}]`}
          </span>
        </td>
      </tr>,
    );

    // Children nodes
    if (hasChildren && isExpanded) {
      node.children.forEach((child) => {
        elements.push(...renderNode(child, true));
      });
    }

    return elements;
  };

  if (filelist.length === 0) {
    return <div className="ab-details-tab-content ab-no-content">No files available.</div>;
  }

  if (!treeData.root) {
    return <div className="ab-details-tab-content ab-no-content">Error loading file tree.</div>;
  }

  const fileCount = filelist.length;
  const folderCount = treeData.nodes.size - fileCount - 1; // -1 for root

  return (
    <div className="ab-details-tab-content">
      <div className="ab-tree-filelist-header" style={{ marginBottom: "10px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span>
            <strong>Tree View</strong> - {fileCount} file{fileCount !== 1 ? "s" : ""}
            {folderCount > 0 && ` in ${folderCount} folder${folderCount !== 1 ? "s" : ""}`}
          </span>
          {folderCount > 0 && (
            <button
              type="button"
              className="ab-tree-toggle-all"
              onClick={toggleAll}
              style={{
                background: "none",
                border: "none",
                color: "inherit",
                cursor: "pointer",
                fontFamily: "monospace",
                fontSize: "1.2em",
                padding: "2px 8px",
              }}
            >
              {allExpanded ? "[-]" : "[+]"}
            </button>
          )}
        </div>
      </div>

      <table className="ab-filelist-table">
        <thead>
          <tr className="ab-filelist-header">
            <th>
              <strong>File Name</strong>
            </th>
            <th>
              <strong>Size</strong>
            </th>
          </tr>
        </thead>
        <tbody>{renderNode(treeData.root)}</tbody>
      </table>
    </div>
  );
}
