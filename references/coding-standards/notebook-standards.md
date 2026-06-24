# Jupyter Notebook & Data Science Standards

This document serves as the repository's source of truth for Jupyter Notebook (`.ipynb`) version control hygiene, environment isolation managers, and automated notebook linting gates.

---

## 1. VCS Output Stripping (Clean Commits)

Jupyter Notebooks store cell execution outputs (such as images, plots, and raw data tables) inside the `.ipynb` JSON structure. Storing these in version control causes repository bloat, unreadable diffs, and exposes internal data or PII.

### 1.1 Git Integration (`.gitattributes`)
To automatically strip outputs before staging files in Git, add the following to `.gitattributes` in your repository root (requires the `nbstripout` package to be installed):
```ini
# Strip Jupyter Notebook outputs before staging
*.ipynb filter=nbstripout
```

Run these commands to register the filter in your local Git configuration:
```bash
git config filter.nbstripout.clean "nbstripout"
git config filter.nbstripout.smudge "cat"
git config filter.nbstripout.required true
```

### 1.2 Mercurial Integration (`.hg/hgrc` or `mercurial.ini`)
To configure auto-stripping in Mercurial, register clean/smudge encoders in your hgrc configuration:
```ini
[encode]
**.ipynb = nbstripout

[decode]
**.ipynb = cat
```

### 1.3 Perforce Integration (P4 Triggers)
In Perforce, write validation triggers that reject submits containing notebook output cells, or run pre-submit client loops:
```bash
# Example pre-submit client loop command
find . -name "*.ipynb" -exec nbstripout {} \;
```

---

## 2. Environment Managers Isolation

To prevent "it works on my machine" issues and CUDA/dependency collisions, all data science projects must use pinned virtual environments (such as Conda, Poetry, or Pipenv).

### 2.1 Poetry Python Configuration (`pyproject.toml`)
Poetry is recommended for packaging and lockfile management in data science.

```toml
[tool.poetry]
name = "data-science-project"
version = "1.0.0"
description = "Reproducible data science and machine learning repository"
authors = ["Data Science Team <ds@mycompany.com>"]

[tool.poetry.dependencies]
python = "^3.10"
pandas = "^2.1.0"
numpy = "^1.24.0"
scikit-learn = "^1.3.0"
# Pin deep learning libraries clearly
torch = {version = "^2.0.0", source = "pytorch"}

[[tool.poetry.source]]
name = "pytorch"
url = "https://download.pytorch.org/whl/cpu"
priority = "explicit"

[tool.poetry.group.dev.dependencies]
jupyterlab = "^4.0.0"
nbstripout = "^0.6.0"
nbqa = "^1.7.0"
ruff = "^0.1.0"

[build-system]
requires = ["poetry-core>=1.0.0"]
build-backend = "poetry.core.masonry.api"
```

### 2.2 Conda Environment Configuration (`environment.yml`)
Use Conda for projects requiring native binary dependencies (e.g. specific CUDA drivers or compiled libraries).

```yaml
name: ds-environment
channels:
  - pytorch
  - conda-forge
  - defaults
dependencies:
  - python=3.10
  - pandas=2.1.0
  - numpy=1.24.0
  - pytorch::pytorch=2.0.0
  - conda-forge::nbstripout=0.6.0
  - conda-forge::nbqa=1.7.0
  - conda-forge::ruff=0.1.0
  - pip
  - pip:
      - pandera==0.16.0
```

---

## 3. Notebook Linters & Quality Gates

Use `nbqa` to run standard code styling and quality checkers (such as Black, Flake8, or Ruff) on raw `.ipynb` files during pre-commit hooks.

### 3.1 nbqa Configuration (`pyproject.toml`)
```toml
[tool.nbqa.config]
ruff = "pyproject.toml"

[tool.nbqa.mutate]
ruff = 1   # Allow nbqa to fix formatting in notebooks

[tool.nbqa.addopts]
ruff = [
    "--ignore=E402", # Ignore import position errors (common in notebooks)
    "--ignore=E501"  # Ignore line length limits in notebooks
]
```

### 3.2 Automated pre-commit config (`.pre-commit-config.yaml`)
```yaml
repos:
  - repo: https://github.com/nbQA-dev/nbQA
    rev: 1.7.0
    hooks:
      - id: nbqa-ruff
        additional_dependencies: [ruff==0.1.0]
```
