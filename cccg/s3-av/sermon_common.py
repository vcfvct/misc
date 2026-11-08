"""Shared sermon configuration and date validation for Wix and YouTube."""

import argparse
import datetime
from pathlib import Path
import re


CONFIG_PATH = Path(__file__).resolve().parent / '.sermon.local.yaml'


class SermonError(Exception):
    """An actionable configuration, input, or service error."""


def sermon_date(value):
    if not re.fullmatch(r'\d{8}', value):
        raise argparse.ArgumentTypeError('Use YYYYMMDD, for example 20261018.')
    try:
        return datetime.datetime.strptime(value, '%Y%m%d').date()
    except ValueError as error:
        raise argparse.ArgumentTypeError('Invalid sermon date: ' + value) from error


def load_config(path):
    if path.suffix.lower() not in ('.yaml', '.yml'):
        raise SermonError('Config must use a .yaml or .yml extension.')
    if not path.exists():
        return {}
    text = path.read_text(encoding='utf-8-sig')
    try:
        import yaml
    except ImportError as error:
        raise SermonError('YAML config requires PyYAML. Run uv sync --locked in the project root.') from error
    try:
        config = yaml.safe_load(text)
    except yaml.YAMLError as error:
        # YAML diagnostics may contain credentials from the source file.
        raise SermonError('Invalid YAML config. Check indentation, quotes, and key: value syntax.') from error
    if config is None:
        config = {}
    if not isinstance(config, dict) or any(not isinstance(key, str) for key in config):
        raise SermonError('Config must be a mapping with string keys.')
    config = {key: '' if value is None else value for key, value in config.items()}
    if any(not isinstance(value, str) for value in config.values()):
        raise SermonError('Config values must be strings or blank. Quote numeric and boolean values.')
    allowed = {'siteId', 'wixApiKey', 'authorId', 'categoryId', 'speaker', 'title'}
    if set(config) - allowed:
        raise SermonError('Unknown config fields: ' + ', '.join(sorted(set(config) - allowed)))
    return config
