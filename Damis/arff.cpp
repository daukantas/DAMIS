#include "arff.h"
#include <fstream>
#include <string>
#include <sstream>
#include <stdlib.h>
#include <algorithm>
#include "DataObject.h"

ARFF::ARFF(){
    data.reserve(0);
    attributes.reserve(0);
}

ARFF::ARFF(const char* path){ 
    reason = "";
    std::stringstream s;
    std::ifstream file (path);
    std::string line_from_file;
    std::string tmp1, tmp2;
    std::vector<std::string> tmp;
    std::vector<double> v;
    readSuccess = false;
    int line_no = 1;
    if (file.is_open() != false)
    {
        readSuccess = true;
        while (std::getline(file, line_from_file))
        {
            if (line_from_file.length() == 0)
            {
                line_no++;
                continue;
            }
            std::istringstream iss(line_from_file);		
            std::string sub;
            iss >> sub;
            if (sub == "%")	
            {
                line_no++;
                continue;
            }
            else
            {
                std::transform(sub.begin(), sub.end(), sub.begin(), ::toupper);
                if (sub == "@ATTRIBUTE")
                {
                    iss >> tmp1;
                    iss >> tmp2;
                    std::transform(tmp1.begin(), tmp1.end(), tmp1.begin(), ::toupper);
                    std::transform(tmp2.begin(), tmp2.end(), tmp2.begin(), ::toupper);
                    if (tmp2 == "REAL"  || tmp2 == "INTEGER")
                    {
                        attributes.push_back(tmp1);
                        data_types.push_back(tmp2);
                    }
                }
                else if (sub == "@DATA" || sub == "@RELATION")
                {
                    line_no++;
                    continue;
                }
                else
                {
                    tmp = split(line_from_file, ',');
                    if (tmp.size() != attributes.size())
                    {
                        readSuccess = false;
                        s<< "Number of features at line " << line_no << " does not match number of attributes";
                        reason = s.str();
                        break;
                    }
                    else
                    {
                        for (unsigned int i = 0; i < tmp.size(); i++)
                        {
                            if (data_types[i] == "REAL" || data_types[i] == "INTEGER")
                            {
                                if (tmp[i] == "?" || tmp[i] == "")
                                {
                                    readSuccess = false;
                                    s << "Unexpected symbol found at " << line_no << " line";                                    
                                    reason = s.str();
                                    break;
                                }
                                else
                                {
                                    try
                                    {
                                        v.push_back(atof(tmp[i].c_str()));
                                    }
                                    catch (int x)
                                    {
                                        s << "Unexpected symbol found at " << line_no << " line";
                                        reason = s.str();
                                        break;
                                    }
                                }
                            }
                        }
                        if (readSuccess == false)
                        {
                            s << "Unexpected symbol found at " << line_no << " line";
                            reason = s.str();
                            break;
                        }
                        else
                        {
                            data.push_back(v);
                            v.clear();
                        }
                    }
                }
            }
            line_no++;
        }
        file.close();
    }
    else
        reason = "Cannot open file!!!";
}

ARFF::~ARFF(){
    data.clear();
    attributes.clear();
}

std::vector<std::string> ARFF::GetAttributes(){
    return attributes;
}

std::vector<std::vector<double> > ARFF::GetData(){
    return data;
}

std::vector<std::string> ARFF::split(const std::string &s, char delim, std::vector<std::string> &elems){
    std::stringstream ss(s);
    std::string item;
    while (std::getline(ss, item, delim)) {
        elems.push_back(item);
    }
    return elems;
}
    
std::vector<std::string> ARFF::split(const std::string& s, char delim){
    std::vector<std::string> elems;
    split(s, delim, elems);
    return elems;
}

void ARFF::WriteData(const char* path, std::vector<DataObject> data)
{
    std::ofstream file (path);
    int n = data.size();
    int k = 0;
    int featureCount = data.at(0).getFeatureCount();
    for (int i = 0; i < featureCount; i++)
        file<<"@ATTRIBUTE attr_"<<(i + 1)<<" REAL"<<std::endl;
    
    file<<"@DATA"<<std::endl;
        
    for (int i = 0; i < n; i++)
    {
        k = data.at(i).getFeatureCount();
        for (int j = 0; j < k - 1; j++)
            file<<data.at(i).getFeatureAt(j)<<",";
        file<<data.at(i).getFeatureAt(k - 1)<<std::endl;
    }
    file.close();
}

std::string ARFF::getReason()
{
    return reason;
}

int ARFF::getFileReadStatus()
{
    if (readSuccess == true)
        return 1;
    else
        return 0;
}
