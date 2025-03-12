#!/bin/bash
git checkout public
git fetch public
git merge public/main
git checkout main
git merge public
git push origin main
