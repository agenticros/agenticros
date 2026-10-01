from setuptools import find_packages
from setuptools import setup

setup(
    name='agenticros_msgs',
    version='0.0.1',
    packages=find_packages(
        include=('agenticros_msgs', 'agenticros_msgs.*')),
)
