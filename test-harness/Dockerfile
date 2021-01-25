FROM python:3.6-alpine3.7

# update apk repo
RUN echo "http://dl-4.alpinelinux.org/alpine/v3.7/main" >> /etc/apk/repositories && \
    echo "http://dl-4.alpinelinux.org/alpine/v3.7/community" >> /etc/apk/repositories

# install chromedriver
RUN apk add --no-cache bash chromium chromium-chromedriver

# install python requirements
COPY requirements.txt /src/requirements.txt
RUN pip install -r /src/requirements.txt

COPY wait-for-it.sh run-tests.sh test.html tests.py /src/

WORKDIR /src
CMD ["python", "tests.py"]
