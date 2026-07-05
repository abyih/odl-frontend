import { useEffect, useRef, useCallback } from 'react';
import type { Topology, TopologyNode, TopologyLink } from '@/types/odl';

interface GraphNode {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
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
  const animFrameRef = useRef<number>(0);
  const dragNodeRef = useRef<GraphNode | null>(null);
  const hoveredNodeRef = useRef<GraphNode | null>(null);
  const mouseRef = useRef({ x: 0, y: 0 });

  const parseTopology = useCallback((topo: Topology | null) => {
    if (!topo) return { nodes: [] as GraphNode[], links: [] as GraphLink[] };

    const topoNodes: TopologyNode[] = topo.node || topo['network-topology:node'] || [];
    const topoLinks: TopologyLink[] = topo.link || topo['network-topology:link'] || [];

    // Only include switch nodes (openflow:X), not host nodes
    const switchNodes = topoNodes.filter(n => n['node-id'].startsWith('openflow:'));

    const nodes: GraphNode[] = switchNodes.map((n, i) => {
      const existing = nodesRef.current.find(en => en.id === n['node-id']);
      const angle = (2 * Math.PI * i) / Math.max(switchNodes.length, 1);
      const radius = Math.min(width, height) * 0.3;
      return {
        id: n['node-id'],
        x: existing?.x ?? width / 2 + radius * Math.cos(angle),
        y: existing?.y ?? height / 2 + radius * Math.sin(angle),
        vx: 0,
        vy: 0,
        ports: n['termination-point']?.length || 0,
        label: n['node-id'].replace('openflow:', 'SW '),
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
  }, [topology, parseTopology]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    const simulate = () => {
      const nodes = nodesRef.current;
      const links = linksRef.current;

      // Simple force simulation
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = nodes[j].x - nodes[i].x;
          const dy = nodes[j].y - nodes[i].y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          const force = 2000 / (dist * dist);
          const fx = (dx / dist) * force;
          const fy = (dy / dist) * force;
          nodes[i].vx -= fx;
          nodes[i].vy -= fy;
          nodes[j].vx += fx;
          nodes[j].vy += fy;
        }
      }

      // Spring force for links
      for (const link of links) {
        const a = nodes.find(n => n.id === link.source);
        const b = nodes.find(n => n.id === link.target);
        if (!a || !b) continue;
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const force = (dist - 150) * 0.02;
        const fx = (dx / dist) * force;
        const fy = (dy / dist) * force;
        a.vx += fx;
        a.vy += fy;
        b.vx -= fx;
        b.vy -= fy;
      }

      // Center gravity
      for (const node of nodes) {
        node.vx += (width / 2 - node.x) * 0.001;
        node.vy += (height / 2 - node.y) * 0.001;

        if (node !== dragNodeRef.current) {
          node.vx *= 0.9;
          node.vy *= 0.9;
          node.x += node.vx;
          node.y += node.vy;
          // Boundary
          node.x = Math.max(30, Math.min(width - 30, node.x));
          node.y = Math.max(30, Math.min(height - 30, node.y));
        }
      }
    };

    const draw = () => {
      simulate();
      const nodes = nodesRef.current;
      const links = linksRef.current;

      ctx.clearRect(0, 0, width, height);

      // Draw grid
      const isDark = document.documentElement.classList.contains('dark');
      ctx.strokeStyle = isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.04)';
      ctx.lineWidth = 1;
      for (let x = 0; x < width; x += 40) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = 0; y < height; y += 40) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      // Draw links
      for (const link of links) {
        const a = nodes.find(n => n.id === link.source);
        const b = nodes.find(n => n.id === link.target);
        if (!a || !b) continue;

        const gradient = ctx.createLinearGradient(a.x, a.y, b.x, b.y);
        gradient.addColorStop(0, isDark ? 'rgba(99,141,255,0.6)' : 'rgba(59,130,246,0.5)');
        gradient.addColorStop(1, isDark ? 'rgba(139,92,246,0.6)' : 'rgba(139,92,246,0.5)');

        ctx.strokeStyle = gradient;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();

        // Animated dot along link
        const t = (Date.now() % 3000) / 3000;
        const dotX = a.x + (b.x - a.x) * t;
        const dotY = a.y + (b.y - a.y) * t;
        ctx.fillStyle = isDark ? 'rgba(99,141,255,0.8)' : 'rgba(59,130,246,0.7)';
        ctx.beginPath();
        ctx.arc(dotX, dotY, 2.5, 0, Math.PI * 2);
        ctx.fill();
      }

      // Draw nodes
      for (const node of nodes) {
        const isHovered = hoveredNodeRef.current?.id === node.id;
        const nodeRadius = isHovered ? 24 : 20;

        // Glow
        if (isHovered) {
          ctx.shadowColor = isDark ? 'rgba(99,141,255,0.5)' : 'rgba(59,130,246,0.4)';
          ctx.shadowBlur = 15;
        }

        // Node body
        ctx.fillStyle = isDark
          ? (isHovered ? 'rgba(99,141,255,0.3)' : 'rgba(30,41,59,0.9)')
          : (isHovered ? 'rgba(219,234,254,1)' : 'rgba(255,255,255,0.95)');
        ctx.strokeStyle = isDark
          ? (isHovered ? 'rgba(99,141,255,0.8)' : 'rgba(71,85,105,0.6)')
          : (isHovered ? 'rgba(59,130,246,0.7)' : 'rgba(203,213,225,0.8)');
        ctx.lineWidth = isHovered ? 2.5 : 1.5;

        ctx.beginPath();
        ctx.arc(node.x, node.y, nodeRadius, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;

        // Switch icon (simplified)
        ctx.strokeStyle = isDark ? 'rgba(148,163,184,0.8)' : 'rgba(71,85,105,0.7)';
        ctx.lineWidth = 1.5;
        const s = nodeRadius * 0.4;
        // Box shape
        ctx.strokeRect(node.x - s, node.y - s * 0.6, s * 2, s * 1.2);
        // Ports
        for (let p = 0; p < 3; p++) {
          const px = node.x - s + s * 0.5 + p * s * 0.5;
          ctx.fillStyle = isDark ? 'rgba(52,211,153,0.7)' : 'rgba(16,185,129,0.7)';
          ctx.beginPath();
          ctx.arc(px, node.y, 2, 0, Math.PI * 2);
          ctx.fill();
        }

        // Label
        ctx.fillStyle = isDark ? 'rgba(226,232,240,0.9)' : 'rgba(30,41,59,0.9)';
        ctx.font = `${isHovered ? '11' : '10'}px Inter Variable, sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillText(node.label, node.x, node.y + nodeRadius + 14);
      }

      // Empty state
      if (nodes.length === 0) {
        ctx.fillStyle = isDark ? 'rgba(148,163,184,0.5)' : 'rgba(100,116,139,0.5)';
        ctx.font = '14px Inter Variable, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('No topology data available', width / 2, height / 2 - 10);
        ctx.font = '12px Inter Variable, sans-serif';
        ctx.fillText('Connect to ODL controller to view network topology', width / 2, height / 2 + 10);
      }

      animFrameRef.current = requestAnimationFrame(draw);
    };

    draw();

    // Mouse events
    const getNodeAtPos = (x: number, y: number): GraphNode | null => {
      for (const node of nodesRef.current) {
        const dx = node.x - x;
        const dy = node.y - y;
        if (dx * dx + dy * dy < 25 * 25) return node;
      }
      return null;
    };

    const getMousePos = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      return { x: e.clientX - rect.left, y: e.clientY - rect.top };
    };

    const handleMouseDown = (e: MouseEvent) => {
      const pos = getMousePos(e);
      const node = getNodeAtPos(pos.x, pos.y);
      if (node) {
        dragNodeRef.current = node;
        canvas.style.cursor = 'grabbing';
      }
    };

    const handleMouseMove = (e: MouseEvent) => {
      const pos = getMousePos(e);
      mouseRef.current = pos;

      if (dragNodeRef.current) {
        dragNodeRef.current.x = pos.x;
        dragNodeRef.current.y = pos.y;
        dragNodeRef.current.vx = 0;
        dragNodeRef.current.vy = 0;
      } else {
        const node = getNodeAtPos(pos.x, pos.y);
        hoveredNodeRef.current = node;
        canvas.style.cursor = node ? 'grab' : 'default';
      }
    };

    const handleMouseUp = () => {
      if (dragNodeRef.current) {
        canvas.style.cursor = 'grab';
        dragNodeRef.current = null;
      }
    };

    const handleClick = (e: MouseEvent) => {
      const pos = getMousePos(e);
      const node = getNodeAtPos(pos.x, pos.y);
      if (node && onNodeClick) {
        onNodeClick(node.id);
      }
    };

    canvas.addEventListener('mousedown', handleMouseDown);
    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mouseup', handleMouseUp);
    canvas.addEventListener('click', handleClick);

    return () => {
      cancelAnimationFrame(animFrameRef.current);
      canvas.removeEventListener('mousedown', handleMouseDown);
      canvas.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('mouseup', handleMouseUp);
      canvas.removeEventListener('click', handleClick);
    };
  }, [width, height, onNodeClick]);

  return (
    <canvas
      ref={canvasRef}
      style={{ width, height }}
      className="rounded-lg border bg-card"
    />
  );
}
