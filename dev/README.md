npm version patch

export $(cat .env | xargs) && npm run publish

npm version patch # bumps version + creates git tag
git push && git push --tags # pushes tag → triggers CI
