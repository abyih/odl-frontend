import { useEffect, useRef, useCallback } from 'react';
import type { Topology, TopologyNode, TopologyLink } from '@/types/odl';

interface GraphNode {
  id: string;
  x: number;
  y: number;
  ports: number;
  label: string;
}

interface GraphLink {
  source: string;
  target: string;
  sourcePort: string;
  targetPort: string;
}

interface TopologyGraphProps {
  topology: Topology | null;
  width?: number;
  height?: number;
  onNodeClick?: (nodeId: string) => void;
}

export function TopologyGraph({ topology, width = 800, height = 500, onNodeClick }: TopologyGraphProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const nodesRef = useRef<GraphNode[]>([]);
  const linksRef = useRef<GraphLink[]>([]);
  const hoveredNodeRef = useRef<GraphNode | null>(null);
  const needsRedrawRef = useRef(true);
  const rafRef = useRef<number>(0);

  const parseTopology = useCallback((topo: Topology | null) => {
    if (!topo) return { nodes: [] as GraphNode[], links: [] as GraphLink[] };

    const topoNodes: TopologyNode[] = topo.node || topo['network-topology:node'] || [];
    const topoLinks: TopologyLink[] = topo.link || topo['network-topology:link'] || [];

    const switchNodes = topoNodes.filter(n => n['node-id'].startsWith('openflow:'));

    const nodes: GraphNode[] = switchNodes.map((n, i) => {
      const existing = nodesRef.current.find(en => en.id === n['node-id']);
      const angle = (2 * Math.PI * i) / Math.max(switchNodes.length, 1) - Math.PI / 2;
      const radius = Math.min(width, height) * 0.3;
      return {
        id: n['node-id'],
        x: existing?.x ?? width / 2 + radius * Math.cos(angle),
        y: existing?.y ?? height / 2 + radius * Math.sin(angle),
        ports: n['termination-point']?.length || n['network-topology:termination-point']?.length || 0,
        label: n['node-id'].replace('openflow:', 's'),
      };
    });

    const nodeIds = new Set(nodes.map(n => n.id));
    const links: GraphLink[] = topoLinks
      .filter(l => nodeIds.has(l.source['source-node']) && nodeIds.has(l.destination['dest-node']))
      .map(l => ({
        source: l.source['source-node'],
        target: l.destination['dest-node'],
        sourcePort: l.source['source-tp'],
        targetPort: l.destination['dest-tp'],
      }));

    return { nodes, links };
  }, [width, height]);

  useEffect(() => {
    const { nodes, links } = parseTopology(topology);
    nodesRef.current = nodes;
    linksRef.current = links;
    needsRedrawRef.current = true;
  }, [topology, parseTopology]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const nodes = nodesRef.current;
    const links = linksRef.current;

    ctx.clearRect(0, 0, width, height);

    const isDark = document.documentElement.classList.contains('dark');
    const colors = isDark
      ? {
          dotGrid: 'rgba(148,163,184,0.06)',
          linkStroke: 'rgba(100,116,139,0.35)',
          linkLabel: 'rgba(148,163,184,0.5)',
          nodeFill: '#1e293b',
          nodeStroke: '#334155',
          nodeHoverFill: '#1e3a5f',
          nodeHoverStroke: '#3b82f6',
          nodeIcon: '#94a3b8',
          nodeIconHover: '#60a5fa',
          label: '#cbd5e1',
          labelHover: '#f1f5f9',
          portDotActive: '#22c55e',
          emptyText: 'rgba(148,163,184,0.4)',
          emptySubtext: 'rgba(148,163,184,0.25)',
        }
      : {
          dotGrid: 'rgba(0,0,0,0.04)',
          linkStroke: 'rgba(148,163,184,0.45)',
          linkLabel: 'rgba(100,116,139,0.4)',
          nodeFill: '#ffffff',
          nodeStroke: '#d1d5db',
          nodeHoverFill: '#eff6ff',
          nodeHoverStroke: '#3b82f6',
          nodeIcon: '#6b7280',
          nodeIconHover: '#3b82f6',
          label: '#374151',
          labelHover: '#111827',
          portDotActive: '#22c55e',
          emptyText: 'rgba(100,116,139,0.45)',
          emptySubtext: 'rgba(100,116,139,0.3)',
        };

    // Dot grid
    ctx.fillStyle = colors.dotGrid;
    const spacing = 24;
    for (let x = spacing; x < width; x += spacing) {
      for (let y = spacing; y < height; y += spacing) {
        ctx.beginPath();
        ctx.arc(x, y, 0.6, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Links
    for (const link of links) {
      const a = nodes.find(n => n.id === link.source);
      const b = nodes.find(n => n.id === link.target);
      if (!a || !b) continue;

      ctx.strokeStyle = colors.linkStroke;
      ctx.lineWidth = 1.5;
      ctx.setLineDash([]);
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();

      // Port labels on each end of the link
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > 80) {
        const nx = dx / dist;
        const ny = dy / dist;
        const offset = 28;

        ctx.font = '9px Inter Variable, system-ui, sans-serif';
        ctx.fillStyle = colors.linkLabel;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        const srcPort = link.sourcePort.split(':').pop() || '';
        ctx.fillText(srcPort, a.x + nx * offset, a.y + ny * offset);

        const tgtPort = link.targetPort.split(':').pop() || '';
        ctx.fillText(tgtPort, b.x - nx * offset, b.y - ny * offset);
      }
    }

    // Nodes — rounded rectangles
    const nodeW = 52;
    const nodeH = 40;
    const nodeR = 6;

    for (const node of nodes) {
      const isHovered = hoveredNodeRef.current?.id === node.id;
      const x = node.x - nodeW / 2;
      const y = node.y - nodeH / 2;

      if (isHovered) {
        ctx.shadowColor = isDark ? 'rgba(59,130,246,0.2)' : 'rgba(59,130,246,0.15)';
        ctx.shadowBlur = 12;
        ctx.shadowOffsetY = 2;
      }

      ctx.fillStyle = isHovered ? colors.nodeHoverFill : colors.nodeFill;
      ctx.strokeStyle = isHovered ? colors.nodeHoverStroke : colors.nodeStroke;
      ctx.lineWidth = isHovered ? 1.5 : 1;
      ctx.beginPath();
      ctx.roundRect(x, y, nodeW, nodeH, nodeR);
      ctx.fill();
      ctx.stroke();

      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;
      ctx.shadowOffsetY = 0;

      // Switch icon
      const iconColor = isHovered ? colors.nodeIconHover : colors.nodeIcon;
      ctx.strokeStyle = iconColor;
      ctx.fillStyle = iconColor;
      ctx.lineWidth = 1.2;

      const bx = node.x - 7;
      const by = node.y - 6;
      const bw = 14;
      const bh = 8;
      ctx.strokeRect(bx, by, bw, bh);

      const portPositions = [bx + 2, bx + 5, bx + 9, bx + 12];
      for (const px of portPositions) {
        ctx.beginPath();
        ctx.moveTo(px, by + bh);
        ctx.lineTo(px, by + bh + 3);
        ctx.stroke();
      }

      // Status dot
      ctx.fillStyle = colors.portDotActive;
      ctx.beginPath();
      ctx.arc(node.x + nodeW / 2 - 8, node.y - nodeH / 2 + 7, 2.5, 0, Math.PI * 2);
      ctx.fill();

      // Label
      ctx.fillStyle = isHovered ? colors.labelHover : colors.label;
      ctx.font = `500 ${isHovered ? '11px' : '10px'} Inter Variable, system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText(node.label, node.x, node.y + nodeH / 2 + 6);

      // Port count
      ctx.fillStyle = colors.linkLabel;
      ctx.font = '9px Inter Variable, system-ui, sans-serif';
      ctx.fillText(`${node.ports} ports`, node.x, node.y + nodeH / 2 + 19);
    }

    // Empty state
    if (nodes.length === 0) {
      ctx.textBaseline = 'middle';
      ctx.textAlign = 'center';

      ctx.fillStyle = colors.emptyText;
      ctx.font = '500 13px Inter Variable, system-ui, sans-serif';
      ctx.fillText('No topology data', width / 2, height / 2 - 8);

      ctx.fillStyle = colors.emptySubtext;
      ctx.font = '12px Inter Variable, system-ui, sans-serif';
      ctx.fillText('Connect OpenFlow switches to populate', width / 2, height / 2 + 12);
    }
  }, [width, height]);

  // Redraw loop — only repaints when flagged
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    const loop = () => {
      if (needsRedrawRef.current) {
        draw();
        needsRedrawRef.current = false;
      }
      rafRef.current = requestAnimationFrame(loop);
    };

    needsRedrawRef.current = true;
    loop();

    return () => cancelAnimationFrame(rafRef.current);
  }, [width, height, draw]);

  // Mouse interactions — flag redraw on hover/drag changes
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const getNodeAtPos = (mx: number, my: number): GraphNode | null => {
      const halfW = 26;
      const halfH = 20;
      for (const node of nodesRef.current) {
        if (Math.abs(node.x - mx) < halfW + 4 && Math.abs(node.y - my) < halfH + 4) {
          return node;
        }
      }
      return null;
    };

    const getMousePos = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      return { x: e.clientX - rect.left, y: e.clientY - rect.top };
    };

    const handleMouseMove = (e: MouseEvent) => {
      const pos = getMousePos(e);
      const node = getNodeAtPos(pos.x, pos.y);
      if (node !== hoveredNodeRef.current) {
        hoveredNodeRef.current = node;
        needsRedrawRef.current = true;
      }
      canvas.style.cursor = node ? 'pointer' : 'default';
    };

    const handleClick = (e: MouseEvent) => {
      const pos = getMousePos(e);
      const node = getNodeAtPos(pos.x, pos.y);
      if (node && onNodeClick) {
        onNodeClick(node.id);
      }
    };

    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('click', handleClick);

    return () => {
      canvas.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('click', handleClick);
    };
  }, [onNodeClick]);

  return (
    <canvas
      ref={canvasRef}
      style={{ width, height }}
      className="rounded-lg border bg-card"
    />
  );
}
