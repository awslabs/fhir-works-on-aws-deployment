#!/bin/bash

# This script copies this repo to another repo and optionally initializes the repo.

echo "Path to repo to copy to (e.g. ../new-solution-name): "
read solution_path
echo "Initialize repo (y/n)?"
read init_repo

cp -r * $solution_path
mkdir -p $solution_path/.github
cp -r .github/* $solution_path/.github/
cp .gitignore $solution_path
cp .viperlight* $solution_path

if [ $init_repo = "y" ]; then
  cd $solution_path
  chmod +x initialize-repo.sh
  ./initialize-repo.sh
fi
