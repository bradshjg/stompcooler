.PHONY: build
build:
	docker build -t rabbitmq-stomp .

.PHONY: run
run: build
	docker run --rm -d -p 15674:15674 -p 15672:15672 -p 61613:61613 --hostname my-rabbit --name my-rabbit rabbitmq-stomp
