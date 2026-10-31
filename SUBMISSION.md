# Book Review — answers for Questions 1–11

Paste each answer below into the corresponding question. Commands were executed against a fresh local server; outputs are captured from cURL, not fabricated. Demo credentials are fictional and exist only in that temporary server process.

## Question 1 — githubrepo

```text
Command:
curl --silent --show-error --fail "https://api.github.com/repos/KinKazuo/expressBookReviews" | node final_project/scripts/fork-summary.js

Output:
{
  "full_name": "KinKazuo/expressBookReviews",
  "html_url": "https://github.com/KinKazuo/expressBookReviews",
  "fork": true,
  "parent": {
    "full_name": "ibm-developer-skills-network/expressBookReviews",
    "html_url": "https://github.com/ibm-developer-skills-network/expressBookReviews"
  },
  "source": {
    "full_name": "ibm-developer-skills-network/expressBookReviews",
    "html_url": "https://github.com/ibm-developer-skills-network/expressBookReviews"
  }
}
```

## Question 2 — getallbooks

```text
Command:
curl --silent --show-error "http://127.0.0.1:5000/" --write-out '\nHTTP %{http_code}\n'

Output:
{
  "1": {
    "author": "Chinua Achebe",
    "title": "Things Fall Apart",
    "reviews": {}
  },
  "2": {
    "author": "Hans Christian Andersen",
    "title": "Fairy tales",
    "reviews": {}
  },
  "3": {
    "author": "Dante Alighieri",
    "title": "The Divine Comedy",
    "reviews": {}
  },
  "4": {
    "author": "Unknown",
    "title": "The Epic Of Gilgamesh",
    "reviews": {}
  },
  "5": {
    "author": "Unknown",
    "title": "The Book Of Job",
    "reviews": {}
  },
  "6": {
    "author": "Unknown",
    "title": "One Thousand and One Nights",
    "reviews": {}
  },
  "7": {
    "author": "Unknown",
    "title": "Njál's Saga",
    "reviews": {}
  },
  "8": {
    "author": "Jane Austen",
    "title": "Pride and Prejudice",
    "reviews": {}
  },
  "9": {
    "author": "Honoré de Balzac",
    "title": "Le Père Goriot",
    "reviews": {}
  },
  "10": {
    "author": "Samuel Beckett",
    "title": "Molloy, Malone Dies, The Unnamable, the trilogy",
    "reviews": {}
  }
}
HTTP 200
```

## Question 3 — getbooksbyISBN

```text
Command:
curl --silent --show-error "http://127.0.0.1:5000/isbn/1" --write-out '\nHTTP %{http_code}\n'

Output:
{
  "author": "Chinua Achebe",
  "title": "Things Fall Apart",
  "reviews": {}
}
HTTP 200
```

## Question 4 — getbooksbyauthor

```text
Command:
curl --silent --show-error "http://127.0.0.1:5000/author/Unknown" --write-out '\nHTTP %{http_code}\n'

Output:
{
  "4": {
    "author": "Unknown",
    "title": "The Epic Of Gilgamesh",
    "reviews": {}
  },
  "5": {
    "author": "Unknown",
    "title": "The Book Of Job",
    "reviews": {}
  },
  "6": {
    "author": "Unknown",
    "title": "One Thousand and One Nights",
    "reviews": {}
  },
  "7": {
    "author": "Unknown",
    "title": "Njál's Saga",
    "reviews": {}
  }
}
HTTP 200
```

## Question 5 — getbooksbytitle

```text
Command:
curl --silent --show-error "http://127.0.0.1:5000/title/Pride" --write-out '\nHTTP %{http_code}\n'

Output:
{
  "8": {
    "author": "Jane Austen",
    "title": "Pride and Prejudice",
    "reviews": {}
  }
}
HTTP 200
```

## Question 6 — getbookreview

```text
Command:
curl --silent --show-error "http://127.0.0.1:5000/review/1" --write-out '\nHTTP %{http_code}\n'

Output:
{}
HTTP 200
```

## Question 7 — register

```text
Command:
curl --silent --show-error --request POST "http://127.0.0.1:5000/register" --header 'Content-Type: application/json' --data '{"username":"bookreader_demo","password":"DemoPassword123!"}' --write-out '\nHTTP %{http_code}\n'

Output:
{
  "message": "User successfully registered. You can now log in."
}
HTTP 201
```

## Question 8 — login

```text
Command:
curl --silent --show-error --request POST "http://127.0.0.1:5000/customer/login" --header 'Content-Type: application/json' --data '{"username":"bookreader_demo","password":"DemoPassword123!"}' --cookie-jar .evidence-cookies.txt --write-out '\nHTTP %{http_code}\n'

Output:
{
  "message": "User successfully logged in",
  "username": "bookreader_demo"
}
HTTP 200
```

## Question 9 — reviewadded

```text
Command:
curl --silent --show-error --request PUT "http://127.0.0.1:5000/customer/auth/review/1" --cookie .evidence-cookies.txt --header 'Content-Type: application/json' --data '{"review":"An insightful novel with memorable characters."}' --write-out '\nHTTP %{http_code}\n'

Output:
{
  "message": "Review added successfully",
  "isbn": "1",
  "reviews": {
    "bookreader_demo": "An insightful novel with memorable characters."
  }
}
HTTP 201

Command:
curl --silent --show-error --request PUT "http://127.0.0.1:5000/customer/auth/review/1" --cookie .evidence-cookies.txt --header 'Content-Type: application/json' --data '{"review":"A powerful story about tradition and change. Highly recommended."}' --write-out '\nHTTP %{http_code}\n'

Output:
{
  "message": "Review updated successfully",
  "isbn": "1",
  "reviews": {
    "bookreader_demo": "A powerful story about tradition and change. Highly recommended."
  }
}
HTTP 200
```

## Question 10 — deletereview

```text
Command:
curl --silent --show-error --request DELETE "http://127.0.0.1:5000/customer/auth/review/1" --cookie .evidence-cookies.txt --write-out '\nHTTP %{http_code}\n'

Output:
{
  "message": "Review for ISBN 1 deleted successfully",
  "isbn": "1",
  "reviews": {}
}
HTTP 200
```

## Question 11 — general.js

https://github.com/KinKazuo/expressBookReviews/blob/main/final_project/router/general.js

The current official upstream is ibm-developer-skills-network/expressBookReviews (plural); the singular URL printed in the assignment returns 404. The fork metadata in Question 1 identifies the real IBM parent.
