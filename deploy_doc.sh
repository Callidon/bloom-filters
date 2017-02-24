#!/bin/bash
# deploy jsdoc to gh-pages
rev=$(git rev-parse --short HEAD)

cd doc

git init
git config user.name "Thomas Minier"
git config user.email "thomas.minier@protonmail.com"

git remote add upstream "https://$GH_TOKEN@github.com/Callidon/bloom-filters.git"
git fetch upstream && git reset upstream/gh-pages

touch .

git add -A .
git commit -m "rebuild gh-pages with doc at ${rev}"
git push -q upstream HEAD:gh-pages
