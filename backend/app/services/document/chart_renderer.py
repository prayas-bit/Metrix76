import io
import base64
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from typing import List
from app.schemas.metrology import InstrumentMeta, WeighingEvaluationResult
from app.services.metrology.engine import OIMLR76Engine

class ChartRendererService:
    @staticmethod
    def render_error_envelope_svg(spec: InstrumentMeta, results: List[WeighingEvaluationResult]) -> str:
        """
        Renders a publication-quality Matplotlib error envelope chart matching OIML R 76-2 Annex A.
        Returns SVG string.
        """
        fig, ax = plt.subplots(figsize=(8, 4.5), dpi=150)
        
        # Determine load points for step envelope
        max_cap = spec.max_capacity
        loads = [r.load_applied for r in results] if results else [0, max_cap * 0.25, max_cap * 0.5, max_cap * 0.75, max_cap]
        
        # Calculate upper and lower mpe limits
        upper_mpe = [OIMLR76Engine.get_mpe(l, spec) for l in sorted(loads)]
        lower_mpe = [-val for val in upper_mpe]
        sorted_loads = sorted(loads)

        # Plot MPE tolerance corridors
        ax.step(sorted_loads, upper_mpe, where='post', color='#dc2626', linestyle='--', linewidth=1.5, label='+mpe Envelope')
        ax.step(sorted_loads, lower_mpe, where='post', color='#dc2626', linestyle='--', linewidth=1.5, label='-mpe Envelope')
        ax.axhline(0, color='#94a3b8', linestyle=':', linewidth=1)

        # Plot observed points
        if results:
            increasing_pts = [r for r in results if r.direction.value == "INCREASING"]
            decreasing_pts = [r for r in results if r.direction.value == "DECREASING"]

            if increasing_pts:
                ax.plot([r.load_applied for r in increasing_pts], [r.corrected_error_ec for r in increasing_pts],
                        'o-', color='#2563eb', label='Increasing Load (Ec)', markersize=5, linewidth=1.5)
            if decreasing_pts:
                ax.plot([r.load_applied for r in decreasing_pts], [r.corrected_error_ec for r in decreasing_pts],
                        's--', color='#7c3aed', label='Decreasing Load (Ec)', markersize=5, linewidth=1.5)

        ax.set_title(f"OIML R 76 Error of Indication Curve (Class {spec.accuracy_class.value})", fontsize=11, fontweight='bold', pad=12)
        ax.set_xlabel(f"Applied Load L [{spec.unit}]", fontsize=9, fontweight='semibold')
        ax.set_ylabel(f"Corrected Error Ec [{spec.unit}]", fontsize=9, fontweight='semibold')
        ax.grid(True, linestyle='--', alpha=0.5)
        ax.legend(loc='best', fontsize=8)
        plt.tight_layout()

        svg_buffer = io.StringIO()
        plt.savefig(svg_buffer, format='svg')
        plt.close(fig)
        return svg_buffer.getvalue()
