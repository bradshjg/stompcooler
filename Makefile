.PHONY: help
help:
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-30s\033[0m %s\n", $$1, $$2}'

.PHONY: docs
docs: ## Generate jsdoc-based documentation
	npx jsdoc stompcooler.js -d docs

.PHONY: demo
demo: ## Run demo
	cd demo && docker-compose up -d
	@echo Visit http://localhost:8000/demo/stomp-demo.html
	cd demo && docker-compose run demo python demo/demo.py
	cd demo && docker-compose stop
