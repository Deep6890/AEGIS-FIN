"""
heatmap.py
----------
Simple heatmap renderer for correlation matrices.

Public API
----------
  plot_heatmap(matrix, title, output_path)
"""

import os
import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns
from typing import Optional


def plot_heatmap(
    matrix: pd.DataFrame,
    title: str = "Correlation Heatmap",
    output_path: Optional[str] = None,
) -> plt.Figure:
    """
    Render a correlation heatmap for the given matrix.

    Parameters
    ----------
    matrix      : pd.DataFrame   Square entity x entity correlation matrix (values in [-1, 1]).
    title       : str            Plot title.
    output_path : str | None     If given, save figure to this path.

    Returns
    -------
    matplotlib.figure.Figure
    """
    n = len(matrix)
    size = max(6.0, 0.9 * n)
    fig, ax = plt.subplots(figsize=(size, size * 0.85))

    sns.heatmap(
        matrix,
        ax=ax,
        cmap="RdYlGn",
        vmin=-1.0,
        vmax=1.0,
        annot=True,
        fmt=".2f",
        linewidths=0.5,
        square=True,
    )

    # annotate NaN cells with "N/A"
    for i in range(matrix.shape[0]):
        for j in range(matrix.shape[1]):
            if pd.isna(matrix.iloc[i, j]):
                ax.text(j + 0.5, i + 0.5, "N/A", ha="center", va="center", fontsize=9, color="gray")

    ax.set_title(title, fontsize=13, pad=12)
    fig.tight_layout()

    if output_path:
        os.makedirs(os.path.dirname(output_path), exist_ok=True) if os.path.dirname(output_path) else None
        fig.savefig(output_path, dpi=150, bbox_inches="tight")
        print(f"Heatmap saved -> {output_path}")

    return fig


def show_heatmaps(
    corr_dict: dict,
    metric_filter: Optional[list] = None,
    output_dir: Optional[str] = None,
) -> None:
    """
    Plot a heatmap for each metric in a corr_dict.

    Parameters
    ----------
    corr_dict     : dict      { metric_name: entity x entity DataFrame }
    metric_filter : list|None If given, only plot these metric names.
    output_dir    : str|None  Directory to save PNGs (one per metric).
    """
    for metric, matrix in corr_dict.items():
        if metric_filter and metric not in metric_filter:
            continue
        if matrix is None or matrix.empty:
            continue

        title = f"Correlation - {metric.replace('_', ' ').title()}"
        out_path = os.path.join(output_dir, f"heatmap_{metric}.png") if output_dir else None
        plot_heatmap(matrix, title=title, output_path=out_path)

    plt.show()
