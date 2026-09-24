from fastapi import APIRouter
from fastapi.responses import Response
from app.schemas.metrology import (
    WeighingBatchRequest,
    WeighingBatchResponse,
    RepeatabilityBatchRequest,
    RepeatabilityBatchResponse,
    EccentricityBatchRequest,
    EccentricityBatchResponse
)
from app.services.metrology.engine import OIMLR76Engine
from app.services.document.chart_renderer import ChartRendererService

router = APIRouter()

@router.post("/evaluate-weighing", response_model=WeighingBatchResponse)
def evaluate_weighing(payload: WeighingBatchRequest):
    """
    Evaluates Clause A.4.4 Weighing Performance.
    """
    return OIMLR76Engine.evaluate_weighing_batch(payload.instrument, payload.points)

@router.post("/evaluate-repeatability", response_model=RepeatabilityBatchResponse)
def evaluate_repeatability(payload: RepeatabilityBatchRequest):
    """
    Evaluates Clause A.4.10 Repeatability Test (3 series of 10 observations).
    """
    return OIMLR76Engine.evaluate_repeatability_batch(payload.instrument, payload.series)

@router.post("/evaluate-eccentricity", response_model=EccentricityBatchResponse)
def evaluate_eccentricity(payload: EccentricityBatchRequest):
    """
    Evaluates Clause A.4.7 Eccentricity Test (Corner Load).
    """
    return OIMLR76Engine.evaluate_eccentricity_batch(payload.instrument, payload.points)

@router.post("/render-error-chart-svg")
def render_error_chart(payload: WeighingBatchRequest):
    """
    Renders publication-ready SVG error envelope graph.
    """
    eval_res = OIMLR76Engine.evaluate_weighing_batch(payload.instrument, payload.points)
    svg_content = ChartRendererService.render_error_envelope_svg(payload.instrument, eval_res.results)
    return Response(content=svg_content, media_type="image/svg+xml")
