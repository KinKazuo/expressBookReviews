Command:
curl --silent --show-error --request POST "http://127.0.0.1:5000/customer/login" --header 'Content-Type: application/json' --data '{"username":"bookreader_demo","password":"DemoPassword123!"}' --cookie-jar .evidence-cookies.txt --write-out '\nHTTP %{http_code}\n'

Output:
{
  "message": "User successfully logged in",
  "username": "bookreader_demo"
}
HTTP 200
