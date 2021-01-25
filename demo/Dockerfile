FROM python:3.6-alpine3.7

RUN apk add --no-cache bash

COPY requirements.txt /src/requirements.txt
RUN pip install -r /src/requirements.txt

WORKDIR /src
CMD ["python", "-m", "http.server"]
